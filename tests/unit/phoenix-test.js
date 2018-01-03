import { Socket } from 'phoenix';
import { module, test } from 'qunit';

module('phoenix javascript module');

test('it works', function(assert) {
  assert.expect(2);
  let done = assert.async();
  let socket = new Socket('/socket', {
    params: { userId: '123' }
  });
  assert.ok(socket);

  socket.connect();

  socket.onClose(() => {
    assert.ok(true, 'Did Close');
    done();
  });
});
