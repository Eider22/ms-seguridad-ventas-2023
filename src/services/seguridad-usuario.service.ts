import {/* inject, */ BindingScope, injectable} from '@loopback/core';
import generator from 'generate-password';
let MD5 = require('crypto-js/md5');

@injectable({scope: BindingScope.TRANSIENT})
export class SeguridadUsuarioService {
  constructor(/* Add @inject to inject parameters */) {}

  crearClave(): string {
    var clave = generator.generate({
      length: 10,
      numbers: true,
    });

    return clave;
  }

  cifrartexto(cadena: string): string {
    let cadenaCifrada = MD5(cadena).toString();
    return cadenaCifrada;
  }
}
