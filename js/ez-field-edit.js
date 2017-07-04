(function () {
    /**
     * `<ez-field-edit>` is supposed to wrap one or several HTML5 inputs. It tracks user input,
     *  and if an input is invalid, sets its own `invalid` property to true. It will also add an
     * `ez-invalid` class on the related label. This class will be removed once the input gets valid.
     *
     * Warning: each element inside <ez-field-edit> can't own more than one couple <input> + <label>
     * Furthermore to connect a <label> to an <input> use `for`
     * Example of a correct markup:
     *
     *    <ez-field-edit>
     *        <div>
     *            <label for="input1">First Input </label>
     *            <input id="input1" type="text"">
     *        <div>
     *        <div>
     *            <input id="input2" type="text"">
     *            <h2>
     *                <label for="input2">Second Input </label>
     *            </h2>
     *        <div>
     *    </ez-field-edit>
     *
     * @polymerElement
     * @demo demo/ez-field-edit.html
    */
    class FieldEdit extends Polymer.Element {
        static get is() {
            return 'ez-field-edit';
        }

        static get properties() {
            return {
                /**
                 * Indicates if the field input is invalid.
                 */
                'invalid': {
                    type: Boolean,
                    value: false,
                    reflectToAttribute: true,
                },
            };
        }

        /**
         * Checks whether the inputs are valid or not and set the `invalid` property
         * accordingly.
         * Also set `ez-invalid-input` class on labels connected to invalid inputs.
         */
        _checkValidity() {
            let valid;
            const invalidInputClass = 'ez-invalid-input';

            this.querySelectorAll('input, select, textarea').forEach((formElement) => {
                const inputId = formElement.id;
                const labels = this.querySelectorAll(`label[for="${formElement.id}"]`);

                valid = formElement.validity.valid;
                if (inputId && labels.length) {
                    labels.forEach((labelElement) => {
                        if (!valid) {
                            this._commonAncestor(labelElement, formElement).classList.add(invalidInputClass);
                        } else {
                            this._commonAncestor(labelElement, formElement).classList.remove(invalidInputClass);
                        }
                    });
                } else {
                    if (!valid) {
                        formElement.parentNode.classList.add(invalidInputClass);
                    } else {
                        formElement.parentNode.classList.remove(invalidInputClass);
                    }
                }
            });
            this.invalid = !valid;
        }

        /**
         * Returns the parentNodes of the given node untill <ez-field-edit>.
         *
         * @param {HTMLElement} node
         * @return {Array}
         */
        _parents(node) {
            const nodes = [];

            for (; node; node = node.parentNode) {
                nodes.unshift(node);
                if (node === this) {
                    break;
                }
            }
            return nodes;
        }

        /**
         * Returns the lowest common ancestor between the two given nodes.
         *
         * @param {HTMLElement} node1
         * @param {HTMLElement} node2
         * @return {HTMLElement}
         */
        _commonAncestor(node1, node2) {
            const parents1 = this._parents(node1);
            const parents2 = this._parents(node2);

            for (let i = 0; i < parents1.length; i++) {
                if (parents1[i] != parents2[i]) {
                    return parents1[i - 1];
                }
            }
        }

        connectedCallback() {
            super.connectedCallback();
            this.addEventListener('input', this._checkValidity.bind(this));
            this._checkValidity();
        }
    }

    customElements.define(FieldEdit.is, FieldEdit);
})();
