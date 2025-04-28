export function bufferFiles(fileList) {
  return Promise.all(fileList.map(f => f.arrayBuffer()));
}
