import { Controller, Get } from '@nestjs/common';
import { PublicUser, UsersService } from './users.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../generated/prisma';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /**
   * Solo admin: es la lista que alimenta el selector de asignacion.
   * Un agent no la necesita, porque no puede reasignar tickets a terceros y
   * los nombres del creador y del asignado ya vienen dentro de cada ticket.
   */
  @Roles(Role.admin)
  @Get()
  findAll(): Promise<PublicUser[]> {
    return this.users.findAll();
  }
}
