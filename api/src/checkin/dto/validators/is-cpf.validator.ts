import {
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

@ValidatorConstraint({ name: 'isCpfFormat' })
class IsCpfFormatConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && /^\d{11}$/.test(value);
  }

  defaultMessage(): string {
    return 'CPF deve conter 11 dígitos numéricos';
  }
}

// Valida apenas o formato (11 dígitos), não o dígito verificador: os CPFs de
// teste do mock-service (ex.: 11111111111) não passariam numa validação real.
export function IsCpfFormat(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isCpfFormat',
      target: object.constructor,
      propertyName,
      options,
      validator: IsCpfFormatConstraint,
    });
  };
}
