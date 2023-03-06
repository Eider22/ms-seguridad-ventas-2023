import {/* inject, */ BindingScope, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import generator from 'generate-password';
import {ConfiguracionSeguridad} from '../config/seguridad.config';
import {Credenciales, FactorAutenticacionPorCodigo, Usuario} from '../models';
import {LoginRepository, UsuarioRepository} from '../repositories';
let MD5 = require('crypto-js/md5');
let jwt = require('jsonwebtoken');

@injectable({scope: BindingScope.TRANSIENT})
export class SeguridadUsuarioService {
  constructor(
    @repository(UsuarioRepository)
    public usuarioRepository: UsuarioRepository,
    @repository(LoginRepository)
    public loginRepository: LoginRepository,
  ) {}

  /**
   * Crear una clave aleatoria
   * @returns cadena aleatoria de 10 caracteres
   */
  crearTextoAleatorio(n: number): string {
    var clave = generator.generate({
      length: n,
      numbers: true,
    });

    return clave;
  }

  /**
   * Cifrar una cadena con método MD5
   * @param cadena a cifrar
   * @returns cadena cifrada con md5
   */
  cifrartexto(cadena: string): string {
    let cadenaCifrada = MD5(cadena).toString();
    return cadenaCifrada;
  }

  /**
   * Se busca un usuario por sus credenciales de acceso
   * @param credenciales del usuario
   * @returns usuario o null
   */
  async identidicarUsuario(
    credenciales: Credenciales,
  ): Promise<Usuario | null> {
    let usuario = await this.usuarioRepository.findOne({
      where: {
        correo: credenciales.correo,
        clave: credenciales.clave,
      },
    });
    return usuario as Usuario;
  }

  /**
   * Valida un codigo 2fa para un usuario
   * @param credenciales del usuario con el id del usuario y el codigo 2fa
   * @returns el registro de login o null
   */
  async validarCodigo2fa(
    credenciales2fa: FactorAutenticacionPorCodigo,
  ): Promise<Usuario | null> {
    let login = await this.loginRepository.findOne({
      where: {
        usuarioId: credenciales2fa.usuarioId,
        codigo2fa: credenciales2fa.codigo2fa,
        estadoCodigo2fa: false,
      },
    });

    if (!login) {
      return null;
    }

    let usuario = await this.usuarioRepository.findById(
      credenciales2fa.usuarioId,
    );

    if (!usuario) {
      return null;
    }

    return usuario;
  }

  /**
   * Generación de JWT
   * @param usuario
   * @returns token
   */
  crearToken(usuario: Usuario): string {
    let datos = {
      name: `${usuario.primerNombre} ${usuario.segundoNombre} ${usuario.primerApellido} ${usuario.segundoApellido} `,
      role: usuario.rolId,
      email: usuario.correo,
    };
    var token = jwt.sign(datos, ConfiguracionSeguridad.claveJWT);
    return token;
  }
}
