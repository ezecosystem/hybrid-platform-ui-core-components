describe('ez-field-edit', function() {
    let element;
    let elementWithMultipleInputs;
    let elementWithoutLabel;

    beforeEach(function () {
        element = fixture('BasicTestFixture');
        elementWithMultipleInputs = fixture('BasicTestFixtureMultipleInputs');
        elementWithoutLabel = fixture('BasicTestFixtureInputWithoutLabel');
    });

    it('should be defined', function () {
        assert.equal(
            window.customElements.get('ez-field-edit'),
            element.constructor
        );
    });

    describe('properties', function () {
        describe('`invalid`', function () {
            it('should default to false', function () {
                assert.notOk(element.invalid);
            });

            describe('set', function () {
                it('should be reflected to an attribute', function () {
                    element.invalid = true;

                    assert.isTrue(
                        element.hasAttribute('invalid')
                    );
                });
            });
        });
    });

    describe('validity', function () {
        it('should get invalid', function () {
            element.querySelector('input').value = 'invalid value';
            element.dispatchEvent(new CustomEvent('input'));
            assert.isTrue(
                element.invalid
            );
        });

        it('should get valid', function () {
            element.invalid = true;
            element.querySelectorAll('input').value = 42;
            element.dispatchEvent(new CustomEvent('input'));
            assert.isFalse(
                element.invalid
            );
        });
    });

    describe('invalid lowest common parentNode between related input and label', function () {
        it('should set `ez-invalid-input` class on the lowest common parentNode', function () {
            elementWithMultipleInputs.querySelector('#lowestCommonParent1 input').value = 'invalid value';

            elementWithMultipleInputs.dispatchEvent(new CustomEvent('input'));
            assert.isTrue(
                elementWithMultipleInputs.querySelector('#lowestCommonParent1').classList.contains('ez-invalid-input')
            );
            assert.isFalse(
                elementWithMultipleInputs.querySelector('#lowestCommonParent2').classList.contains('ez-invalid-input')
            );
        });

        it('should remove `ez-invalid-input` class on the lowest common parentNode', function () {
            const lowestCommonParent1 = elementWithMultipleInputs.querySelector('#lowestCommonParent1');
            const lowestCommonParent2 = elementWithMultipleInputs.querySelector('#lowestCommonParent2');

            lowestCommonParent1.classList.add('ez-invalid-input');
            lowestCommonParent2.classList.add('ez-invalid-input');

            elementWithMultipleInputs.querySelector('#lowestCommonParent1 input').value = 42;
            elementWithMultipleInputs.querySelector('#lowestCommonParent2 input').value= 'notValid';

            elementWithMultipleInputs.dispatchEvent(new CustomEvent('input'));
            assert.isFalse(
                lowestCommonParent1.classList.contains('ez-invalid-input')
            );
            assert.isTrue(
                lowestCommonParent2.classList.contains('ez-invalid-input')
            );
        });
    });

    describe('invalid lowest parentNode if input has no connected label', function () {
        it('should set `ez-invalid-input` class on the lowest parentNode', function () {
            const input = elementWithoutLabel.querySelector('input');

            input.value = 'invalid value';

            elementWithoutLabel.dispatchEvent(new CustomEvent('input'));
            assert.isTrue(
                input.parentNode.classList.contains('ez-invalid-input')
            );
        });

        it('should remove `ez-invalid-input` class on the lowest parentNode', function () {
            const input = elementWithoutLabel.querySelector('input');

            input.parentNode.classList.add('ez-invalid-input');
            input.value = 42;

            elementWithoutLabel.dispatchEvent(new CustomEvent('input'));
            assert.isFalse(
                input.parentNode.classList.contains('ez-invalid-input')
            );
        });
    });
});
