import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Mínimo de letras que debe contener un texto para considerarse informativo.
 *
 * Con una sola letra pasarían cosas como "a 12345"; con tres, un título como
 * "IVA 21% en la factura" o "Error 500 al exportar" sigue siendo válido, y
 * quedan fuera "12345", "!!!!", "   " y "1 - 2 - 3".
 */
export const MIN_LETTERS = 3;

/**
 * `\p{L}` cubre cualquier letra Unicode, así que acepta tildes y eñes igual
 * que la a-z. Sin la bandera `u` el escape de propiedad Unicode no funciona.
 */
const LETTER = /\p{L}/gu;

export function countLetters(value: string): number {
  return (value.match(LETTER) ?? []).length;
}

@ValidatorConstraint({ name: 'hasMeaningfulText', async: false })
class HasMeaningfulTextConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return countLetters(value) >= MIN_LETTERS;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} debe incluir texto, no solo números, espacios o símbolos.`;
  }
}

/**
 * Exige que el texto contenga palabras y no solo relleno.
 *
 * Los números son bienvenidos dentro de una frase (fechas, importes, códigos
 * de error); lo que se rechaza es un campo que solo tiene números, símbolos o
 * espacios, porque no informa ni a quien lee el ticket ni al clasificador de
 * n8n, que trabaja buscando palabras clave en el texto.
 */
export function HasMeaningfulText(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: HasMeaningfulTextConstraint,
    });
  };
}
