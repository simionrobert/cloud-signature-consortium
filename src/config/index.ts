import createError from 'http-errors';
import errors from './errors.json';
import configiguration from './config.json';
import info from './info.json';

Object.keys(errors).map(function(key) {
  errors[key] = createError(errors[key].status, errors[key].error, {
    description: errors[key].error_description
  });
});

export { configiguration as settings };
export { info };
export { errors };
