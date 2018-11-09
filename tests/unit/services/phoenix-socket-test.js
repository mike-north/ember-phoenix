import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Service | phoenix-socket', function(hooks) {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function(assert) {
    let service = this.owner.lookup('service:phoenix-socket');
    assert.ok(service);
  });
});
