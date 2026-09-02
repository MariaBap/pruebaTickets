import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role } from '../../generated/prisma';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { TICKET_SELECT, TicketDto } from './ticket.select';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.ticket.create({
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
  }

  async findAll(user: AuthenticatedUser): Promise<TicketDto[]> {
    return this.prisma.ticket.findMany({
      where: this.scopeFor(user),
      select: TICKET_SELECT,
      orderBy: { createdAt: 'desc' },
    });
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
    await this.findOne(id, user);

    if (
      dto.assignedToId !== undefined &&
      dto.assignedToId !== null &&
      user.role !== Role.admin &&
      dto.assignedToId !== user.id
    ) {
      throw new ForbiddenException('Solo un admin puede asignar tickets a otros usuarios.');
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
