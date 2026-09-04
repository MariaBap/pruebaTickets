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
 * Con un umbral bajo se colaban cosas como "L 22222 aa": cumple la cuenta
 * pero no forma ninguna palabra. Con cinco hace falta al menos una palabra
 * real o dos cortas, y siguen entrando títulos legítimos como
 * "Error 500 al exportar" o "IVA duplicado en la factura 2026".
 */
export const MIN_LETTERS = 5;

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
