import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role, TicketStatus } from '../../generated/prisma';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { TICKET_SELECT, TicketDto } from './ticket.select';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { ListTicketsQueryDto, PaginatedTickets } from './dto/list-tickets.dto';
import { N8nDispatcherService } from '../n8n/n8n-dispatcher.service';

/**
 * Transiciones de estado permitidas a un agent.
 *
 * El flujo de trabajo de un agente avanza en un solo sentido: recoge un ticket
 * abierto, lo trabaja y lo resuelve. Cerrar es una decision de cierre
 * administrativo, y deshacer un estado ya alcanzado tambien, asi que ambas
 * quedan reservadas al admin, que puede pasar de cualquier estado a cualquier
 * otro.
 *
 * Reenviar el estado que el ticket ya tiene siempre se admite: un PATCH que no
 * cambia nada no deberia fallar.
 */
const AGENT_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.open]: [TicketStatus.in_progress],
  [TicketStatus.in_progress]: [TicketStatus.resolved],
  [TicketStatus.resolved]: [],
  [TicketStatus.closed]: [],
};

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly n8n: N8nDispatcherService,
  ) {}

  /**
   * Alcance de datos por rol, expresado como fragmento de `where`.
   *
   * Se compone dentro de la consulta (no filtrando en memoria despues) porque
   * si se filtrara despues de paginar, un agent recibiria paginas incompletas:
   * la base devolveria 10 tickets, el filtro descartaria los ajenos y la
   * pagina llegaria con 3.
   */
  private scopeFor(user: AuthenticatedUser): Prisma.TicketWhereInput {
    if (user.role === Role.admin) {
      return {};
    }

    return {
      OR: [{ createdById: user.id }, { assignedToId: user.id }],
    };
  }

  async create(dto: CreateTicketDto, user: AuthenticatedUser): Promise<TicketDto> {
    // Un agent solo puede dejar el ticket sin asignar o asignarselo a si mismo;
    // repartir trabajo a terceros es cosa de admin.
    if (
      dto.assignedToId !== undefined &&
      user.role !== Role.admin &&
      dto.assignedToId !== user.id
    ) {
      throw new ForbiddenException('Solo un admin puede asignar tickets a otros usuarios.');
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        title: dto.title,
        description: dto.description,
        createdById: user.id,
        assignedToId: dto.assignedToId ?? null,
        // enrichmentStatus queda en `pending` por defecto: el enriquecimiento
        // lo produce n8n, nunca este servicio.
      },
      select: TICKET_SELECT,
    });

    // El disparo va despues del commit y sin await: el ticket ya existe cuando
    // n8n pueda responder, y la respuesta al frontend no espera al workflow.
    this.n8n.dispatch({
      ticketId: ticket.id,
      title: ticket.title,
      description: ticket.description,
      createdAt: ticket.createdAt.toISOString(),
    });

    return ticket;
  }

  /**
   * Listado avanzado: filtros, busqueda por texto, paginacion y ordenamiento.
   *
   * El alcance por rol y los filtros se componen en el MISMO where, y el conteo
   * total usa ese where identico, de modo que `total` y `totalPages` describen
   * lo que ese usuario puede ver y no el total global de la tabla.
   */
  async findAll(
    query: ListTicketsQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedTickets<TicketDto>> {
    const where = this.buildWhere(query, user);
    const skip = (query.page - 1) * query.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        select: TICKET_SELECT,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip,
        take: query.limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  private buildWhere(query: ListTicketsQueryDto, user: AuthenticatedUser): Prisma.TicketWhereInput {
    const filters: Prisma.TicketWhereInput[] = [this.scopeFor(user)];

    if (query.status) filters.push({ status: query.status });
    if (query.priority) filters.push({ priority: query.priority });
    if (query.category) filters.push({ category: query.category });
    if (query.enrichmentStatus) filters.push({ enrichmentStatus: query.enrichmentStatus });
    if (query.assignedToId !== undefined) filters.push({ assignedToId: query.assignedToId });
    if (query.createdById !== undefined) filters.push({ createdById: query.createdById });

    if (query.search) {
      // Busqueda insensible a mayusculas en titulo o descripcion. Va como un
      // AND separado para que no se mezcle con el OR del alcance por rol: si
      // ambos OR quedaran al mismo nivel, un agent veria tickets ajenos que
      // coincidieran con el texto buscado.
      filters.push({
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    return { AND: filters };
  }

  /**
   * Fuera de alcance devuelve 404, no 403: un agent no deberia poder deducir
   * que existe un ticket ajeno probando ids.
   */
  async findOne(id: number, user: AuthenticatedUser): Promise<TicketDto> {
    const ticket = await this.prisma.ticket.findFirst({
      where: { AND: [{ id }, this.scopeFor(user)] },
      select: TICKET_SELECT,
    });

    if (!ticket) {
      throw new NotFoundException(`No existe el ticket ${id}.`);
    }

    return ticket;
  }

  async update(id: number, dto: UpdateTicketDto, user: AuthenticatedUser): Promise<TicketDto> {
    // Comprueba existencia y alcance con las mismas reglas que la lectura.
    const current = await this.findOne(id, user);

    if (
      dto.assignedToId !== undefined &&
      dto.assignedToId !== null &&
      user.role !== Role.admin &&
      dto.assignedToId !== user.id
    ) {
      throw new ForbiddenException('Solo un admin puede asignar tickets a otros usuarios.');
    }

    if (dto.status !== undefined) {
      this.assertCanChangeStatus(current, user);
      this.assertStatusTransition(current.status, dto.status, user);
    }

    return this.prisma.ticket.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId }),
      },
      select: TICKET_SELECT,
    });
  }

  /**
   * Quien puede mover el estado de un ticket.
   *
   * Un agent solo lo hace sobre lo que tiene asignado: haberlo creado no basta.
   * Mover el estado es afirmar algo sobre el trabajo —que esta en curso, que
   * esta resuelto— y quien lo afirma es quien lo atiende, no quien lo reporto.
   * Crear y atender son roles distintos aunque coincidan en la misma persona:
   * si a quien lo creo se le asigna, entonces si puede.
   *
   * Se evalua contra el responsable ANTES de esta actualizacion. Un agent no
   * puede asignarse un ticket y cambiarle el estado en la misma peticion.
   */
  private assertCanChangeStatus(ticket: TicketDto, user: AuthenticatedUser): void {
    if (user.role === Role.admin) {
      return;
    }

    if (ticket.assignedTo?.id !== user.id) {
      throw new ForbiddenException(
        'Solo puedes cambiar el estado de los tickets que tienes asignados.',
      );
    }
  }

  /**
   * Regla de transicion de estado segun el rol. Vive en el servicio y no en el
   * DTO porque depende del estado actual del ticket y de quien lo pide, cosas
   * que un DTO no conoce.
   */
  private assertStatusTransition(
    from: TicketStatus,
    to: TicketStatus,
    user: AuthenticatedUser,
  ): void {
    if (user.role === Role.admin || from === to) {
      return;
    }

    if (to === TicketStatus.closed) {
      throw new ForbiddenException('Solo un admin puede cerrar un ticket.');
    }

    if (!AGENT_TRANSITIONS[from].includes(to)) {
      throw new ForbiddenException(
        `No puedes pasar un ticket de "${from}" a "${to}". Un agente avanza open, in_progress y resolved en ese orden.`,
      );
    }
  }

  /**
   * Borrar es mas destructivo que editar: un agent solo puede borrar lo que
   * creo, no lo que simplemente tiene asignado.
   */
  async remove(id: number, user: AuthenticatedUser): Promise<void> {
    const ticket = await this.findOne(id, user);

    if (user.role !== Role.admin && ticket.createdBy.id !== user.id) {
      throw new ForbiddenException('Solo puedes eliminar tickets que hayas creado.');
    }

    await this.prisma.ticket.delete({ where: { id } });
  }
}
