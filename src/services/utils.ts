export function deleteFile(file) {
  if (file !== '' && file !== undefined && file !== null) {
    require('fs').unlink(`${file}`, err => {
      if (err)
        require('winston').error('Error on deleting the hash file generated');
    });
  }
}

export function hash(value) {
  return require('crypto')
    .createHash('sha256')
    .update(value)
    .digest('hex');
}
