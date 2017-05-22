import Service from '@ember/service';
import { assert } from '@ember/debug';
import Evented from '@ember/object/evented';
import { Socket } from 'phoenix';

export default Service.extend(Evented, {
  socket: null,
  isHealthy: false,

  connect(url, options) {
    const socket = new Socket(url, options);
    socket.onOpen(() => {
      if (this.isDestroyed || this.isDestroying) {
        return;
      }
      this.set('isHealthy', true);
      this.trigger('open', ...arguments);
    });
    socket.onClose(() => {
      if (this.isDestroyed || this.isDestroying) {
        return;
      }
      this.set('isHealthy', false);
      this.trigger('close', ...arguments);
    });
    socket.onError(() => {
      if (this.isDestroyed || this.isDestroying) {
        return;
      }
      this.set('isHealthy', false);
      this.trigger('error', ...arguments);
    });
    this.set('socket', socket);
    return socket.connect();
  },

  joinChannel(name, params) {
    const socket = this.get('socket');
    assert('must connect to a socket first', socket);

    const channel = socket.channel(name, params);
    channel.join();
    return channel;
  }
});
