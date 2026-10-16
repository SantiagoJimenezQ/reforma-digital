// transformers.js importa sharp para tratar imágenes y exige que exista al cargarse. El detector de
// datos personales solo analiza texto, así que la app no lleva esa librería nativa: este módulo
// ocupa su lugar en la compilación y falla si alguien intenta procesar una imagen.
export default function sinImagenes(): never {
  throw new Error('La app no procesa imágenes.');
}
