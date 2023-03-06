import {service} from '@loopback/core';
import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  put,
  requestBody,
  response,
} from '@loopback/rest';
import {
  Credenciales,
  FactorAutenticacionPorCodigo,
  Login,
  Usuario,
} from '../models';
import {LoginRepository, UsuarioRepository} from '../repositories';
import {SeguridadUsuarioService} from '../services';

export class UsuarioController {
  constructor(
    @repository(UsuarioRepository)
    public usuarioRepository: UsuarioRepository,
    @service(SeguridadUsuarioService)
    public servicioSeguridad: SeguridadUsuarioService,
    @repository(LoginRepository)
    public loginRepository: LoginRepository,
  ) {}

  @post('/usuario')
  @response(200, {
    description: 'Usuario model instance',
    content: {'application/json': {schema: getModelSchemaRef(Usuario)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Usuario, {
            title: 'NewUsuario',
            exclude: ['_id'],
          }),
        },
      },
    })
    usuario: Omit<Usuario, '_id'>,
  ): Promise<Usuario> {
    // Crear password
    let clave = this.servicioSeguridad.crearTextoAleatorio(10);
    // Cifrar clave
    let claveCifrada = this.servicioSeguridad.cifrartexto(clave);
    // Asignar clave cifrada al usuario
    usuario.clave = claveCifrada;
    // TODO: enviar correo electrónico de notificación
    return this.usuarioRepository.create(usuario);
  }

  @get('/usuario/count')
  @response(200, {
    description: 'Usuario model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(@param.where(Usuario) where?: Where<Usuario>): Promise<Count> {
    return this.usuarioRepository.count(where);
  }

  @get('/usuario')
  @response(200, {
    description: 'Array of Usuario model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Usuario, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(Usuario) filter?: Filter<Usuario>,
  ): Promise<Usuario[]> {
    return this.usuarioRepository.find(filter);
  }

  @patch('/usuario')
  @response(200, {
    description: 'Usuario PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Usuario, {partial: true}),
        },
      },
    })
    usuario: Usuario,
    @param.where(Usuario) where?: Where<Usuario>,
  ): Promise<Count> {
    return this.usuarioRepository.updateAll(usuario, where);
  }

  @get('/usuario/{id}')
  @response(200, {
    description: 'Usuario model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Usuario, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(Usuario, {exclude: 'where'})
    filter?: FilterExcludingWhere<Usuario>,
  ): Promise<Usuario> {
    return this.usuarioRepository.findById(id, filter);
  }

  @patch('/usuario/{id}')
  @response(204, {
    description: 'Usuario PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Usuario, {partial: true}),
        },
      },
    })
    usuario: Usuario,
  ): Promise<void> {
    await this.usuarioRepository.updateById(id, usuario);
  }

  @put('/usuario/{id}')
  @response(204, {
    description: 'Usuario PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() usuario: Usuario,
  ): Promise<void> {
    await this.usuarioRepository.replaceById(id, usuario);
  }

  @del('/usuario/{id}')
  @response(204, {
    description: 'Usuario DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.usuarioRepository.deleteById(id);
  }

  /**
   * Métodos personalizados para la API
   */
  @post('/identificar-usuario')
  @response(200, {
    description: 'Identificar un usuario por correo y clave',
    content: {
      'aplication/json': {schema: getModelSchemaRef(Usuario)},
    },
  })
  async identificarUsuario(
    @requestBody({
      content: {
        'aplication/json': {schema: getModelSchemaRef(Credenciales)},
      },
    })
    credenciales: Credenciales,
  ): Promise<object> {
    let usuario = await this.servicioSeguridad.identidicarUsuario(credenciales);

    if (!usuario) {
      return new HttpErrors[401]('Credenciales incorrectas');
    }

    //Generar código aleatorio
    let codigo2fa = this.servicioSeguridad.crearTextoAleatorio(5);
    let login: Login = new Login();
    login.usuarioId = usuario._id!;
    login.codigo2fa = codigo2fa;
    login.estadoCodigo2fa = false;
    login.token = '';
    login.estadoToken = false;
    this.loginRepository.create(login);
    usuario.clave = '';
    //notificar al usuario via correo o sms
    return usuario;
  }

  @post('/verificar-2fa')
  @response(200, {
    description: 'Validar un código de 2fa',
  })
  async verificarCodigo(
    @requestBody({
      content: {
        'aplication/json': {
          schema: getModelSchemaRef(FactorAutenticacionPorCodigo),
        },
      },
    })
    credenciales2fa: FactorAutenticacionPorCodigo,
  ): Promise<object> {
    try {
      let usuario = await this.servicioSeguridad.validarCodigo2fa(
        credenciales2fa,
      );

      if (!usuario) {
        return new HttpErrors[401](
          'Código de 2fa inválido para el usuario definido',
        );
      }

      let token = this.servicioSeguridad.crearToken(usuario);

      this.usuarioRepository.logins(usuario._id).patch(
        {
          estadoCodigo2fa: true,
          token,
        },
        {
          estadoCodigo2fa: false,
        },
      );

      usuario.clave = '';

      return {
        user: usuario,
        token: token,
      };
    } catch (error) {
      console.log(error);
      return new HttpErrors[501]('Error en el servidor');
    }
  }
}
