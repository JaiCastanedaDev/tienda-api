import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12; // Aumentado para mayor seguridad

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { name, email, password, tenantName, role } = registerDto;

    // Verificar si el usuario ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Crear un nuevo tenant si se proporciona tenantName o usar nombre del usuario
    const tenant = await this.prisma.tenant.create({
      data: {
        name: tenantName || `Tienda de ${name}`,
        plan: 'free',
        active: true,
      },
    });

    // Hash de la contraseña con bcrypt
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Crear el usuario asociado al nuevo tenant
    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        tenantId: tenant.id,
        role: role || 'OWNER', // El primer usuario es OWNER por defecto
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
        createdAt: true,
      },
    });

    // Generar token JWT
    const token = this.generateToken(user);

    return {
      user,
      tenant: {
        id: tenant.id,
        name: tenant.name,
      },
      access_token: token,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Buscar el usuario por email
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        tenant: true, // Incluir información del tenant
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar que el tenant está activo
    if (!user.tenant.active) {
      throw new UnauthorizedException('Tu tienda no está activa');
    }

    // Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Generar token JWT con el tenant_id incluido
    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        plan: user.tenant.plan,
      },
      access_token: token,
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return user;
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Verificar la contraseña antigua
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }

    // Validar que la nueva contraseña sea diferente
    if (oldPassword === newPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la actual',
      );
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    // Actualizar la contraseña
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Contraseña actualizada exitosamente' };
  }

  private generateToken(user: {
    id: string;
    email: string;
    tenantId: string;
    role: string;
  }): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            plan: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return user;
  }
}
