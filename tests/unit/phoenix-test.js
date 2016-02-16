import { Socket } from 'phoenix';
import { module, test } from 'qunit';

module('phoenix javascript module');


test('it works', function(assert) {
  assert.expect(3);
  let done = assert.async();
  let socket = new Socket('/socket', {
    logger: ((kind, msg, data) => {
      console.log(`${kind}: ${msg}`, data);
    })
  });
  assert.ok(socket);

  socket.connect({user_id: "123"});
  socket.onError(() => {
    assert.ok(true, 'Did Error');
  });
  socket.onClose(() => {
    assert.ok(true, 'Did Close');
    done();
  });

});
