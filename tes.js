import path from 'path'
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const filename = fileURLToPath(import.meta.url)
const dirpath = dirname(filename)

console.log(dirpath)