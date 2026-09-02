import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '../../generated/prisma';
import { PublicUser, UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/authenticated-user';

const BCRYPT_ROUNDS = 10;

/**
 * Hash de descarte con el mismo coste que los reales. Se compara contra el
 * cuando el email no existe, para que un login fallido tarde lo mismo exista
 * o no el usuario y no se pueda enumerar cuentas midiendo tiempos.
 */
const DUMMY_HASH = bcrypt.hashSync('cuenta-inexistente', BCRYPT_ROUNDS);

export interface AuthResult {
  accessToken: string;
  user: PublicUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.users.findByEmailWithHash(dto.email);
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese email.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // El registro publico crea siempre un `agent`. No hay forma de auto-
    // promoverse a admin: los admin salen del seed. El enunciado pide registro
    // pero no dice que rol asigna, y un endpoint publico que cree admins seria
    // un agujero de autorizacion.
    const user = await this.users.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: Role.agent,
    });

    return { accessToken: this.sign(user), user };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const found = await this.users.findByEmailWithHash(dto.email);
    const matches = await bcrypt.compare(dto.password, found?.passwordHash ?? DUMMY_HASH);

    // Mismo mensaje para email inexistente y contrasena incorrecta.
    if (!found || !matches) {
      throw new UnauthorizedException('Credenciales invalidas.');
    }

    const user: PublicUser = {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role,
      createdAt: found.createdAt,
    };

    return { accessToken: this.sign(user), user };
  }

  private sign(user: PublicUser): string {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return this.jwt.sign(payload);
  }
}
