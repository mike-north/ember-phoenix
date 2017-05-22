import Controller from '@ember/controller';
import { inject } from '@ember/service';

export default Controller.extend({
  'user-socket': inject()
});
