/* global describe, it, assert, fixture */
describe('ez-platform-ui-app', function() {
    it('should be defined', function () {
        const element = fixture('BasicTestFixture');

        assert.equal(
            window.customElements.get('ez-platform-ui-app'),
            element.constructor
        );
    });
});
