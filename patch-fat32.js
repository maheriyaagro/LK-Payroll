const fs = require('fs');

const origReadlink = fs.readlink;
fs.readlink = function (path, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  return origReadlink.call(fs, path, options, (err, target) => {
    if (err && err.code === 'EISDIR') {
      const einvalErr = new Error(`EINVAL: invalid argument, readlink '${path}'`);
      einvalErr.code = 'EINVAL';
      einvalErr.errno = -4071;
      einvalErr.syscall = 'readlink';
      einvalErr.path = path;
      return callback(einvalErr);
    }
    return callback(err, target);
  });
};

const origReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function (path, options) {
  try {
    return origReadlinkSync.call(fs, path, options);
  } catch (err) {
    if (err && err.code === 'EISDIR') {
      const einvalErr = new Error(`EINVAL: invalid argument, readlink '${path}'`);
      einvalErr.code = 'EINVAL';
      einvalErr.errno = -4071;
      einvalErr.syscall = 'readlink';
      einvalErr.path = path;
      throw einvalErr;
    }
    throw err;
  }
};
