import {Model, model, property} from '@loopback/repository';

@model()
export class FactorAutenticacionPorCodigo extends Model {
  @property({
    type: 'string',
    required: true,
  })
  usuarioId: string;

  @property({
    type: 'string',
    required: true,
  })
  codigo2fa: string;

  constructor(data?: Partial<FactorAutenticacionPorCodigo>) {
    super(data);
  }
}

export interface FactorAutenticacionPorCodigoRelations {
  // describe navigational properties here
}

export type FactorAutenticacionPorCodigoWithRelations =
  FactorAutenticacionPorCodigo & FactorAutenticacionPorCodigoRelations;
