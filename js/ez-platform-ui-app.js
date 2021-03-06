/* global eZ */
(function () {
    function updateElement(element, updateStruct) {
        if ( typeof updateStruct === 'string' ) {
            element.innerHTML = updateStruct;
        } else if ( updateStruct ) {
            const properties = updateStruct.properties || {};
            const attributes = updateStruct.attributes || {};
            const children = updateStruct.children || [];

            Object.keys(attributes).forEach(function (attributeName) {
                element.setAttribute(attributeName, attributes[attributeName]);
            });
            Object.keys(properties).forEach(function (propertyName) {
                element[propertyName] = properties[propertyName];
            });
            children.forEach(function (childUpdate) {
                if ( childUpdate ) {
                    const child = element.querySelector(childUpdate.selector);

                    if ( child ) {
                        updateElement(child, childUpdate.update);
                    } else {
                        console.warn(`Unable to find ${childUpdate.selector} under`, element);
                    }
                }
            }, element);
        }
        return updateStruct;
    }

    const {Modal, AjaxFetcher, AutoSubmit, RunUniversalDiscovery} = eZ.mixins;

    /**
     * `<ez-platform-ui-app>` represents the application in a page which will
     * enhance the navigation by avoiding full page refresh. It is responsible
     * for handling click on links and form submit and for fetching and applying
     * the corresponding update. It also manipulates the browser's history so
     * that the back and forward buttons works as expected. A large part of this
     * mechanism relies on the server ability to render the page as a JSON
     * update struct and that's why it's possible opt out from it.
     *
     * If a link has the class `ez-js-standard-navigation` or if it has an
     * ancestor having that class, the app will just let the navigation happen.
     * (or let another JavaScript code to handle click on such link)
     *
     * Example:
     * ```
     * <ul class="ez-js-standard-navigation">
     *   <li><a href="/">This link won't be enhanced</a></li>
     *   <li><a href="/path">Same for this one</a>
     * </ul>
     * <a href="/path2" class="ez-js-standard-navigation">Or this one</a>
     * ```
     *
     * For forms, the class `ez-js-standard-form` set on a form or on an
     * ancestor of a form allows the form to be submitted normally (or let
     * another JavaScript code to handle form submit).
     *
     * Example:
     * ```
     * <form action="/whatever" class="ez-js-standard-form">
     *   <input type="text" name="something" value="the app ignores me!">
     * </form>
     * <div class="ez-js-standard-form">
     *   <form action="/whatever">
     *     <input type="text" name="name" value="the app ignores me as well!">
     *   </form>
     * </div>
     * ```
     *
     * It is also created with `eZ.mixins.RunUniversalDiscovery` and
     * `eZ.mixins.Modal` mixins, so the app is also able to recognize the markup
     * conventions defined in those.
     *
     * Among others standard APIs, this component relies on `fetch` and
     * `Element.closest`. `fetch` is not supported by Safari 10.0 and
     * `Element.closest` is not available in Edge 14. So for this component to
     * work in those browser, the page should include polyfills of those
     * standard API.
     *
     * @polymerElement
     * @demo demo/ez-platform-ui-app.html
     */
    class PlatformUiApp extends AjaxFetcher(AutoSubmit(RunUniversalDiscovery(Modal(Polymer.Element)))) {
        static get is() {
            return 'ez-platform-ui-app';
        }

        static get properties() {
            return {
                /**
                 * Indicates whether the app is correctly waiting for a server
                 * response.
                 */
                updating: {
                    type: Boolean,
                    reflectToAttribute: true,
                    value: false,
                },

                /**
                 * Title of the app page. It is the page title by default and
                 * changes are reflected to the page title as well.
                 */
                pageTitle: {
                    type: String,
                    value: document.title,
                    observer: '_setPageTitle',
                },

                /**
                 * The URL to fetch to get an update. Set to the page location
                 * href by default. Setting this value triggers an XHR request
                 * to fetch the update.
                 */
                url: {
                    type: String,
                    reflectToAttribute: true,
                    value: location.href,
                    observer: '_triggerUpdate',
                },

                /**
                 * Array of notifications to display to the user. A notification
                 * is described by an object with the following properties:
                 *
                 * - `type` a String representing the type of the notification
                 *   (`error`, `processing`, `positive`, ...)
                 * - `timeout` a Number of seconds after which the notification
                 *   will disappear. 0 means the notification will not disappear
                 *   by itself
                 * - `content` a String containing the HTML to display to the
                 *   user.
                 * - [optional] `details` a String containing details about the
                 *   notification
                 * - [optional] `copyable` a Boolean, if true the user will see
                 *   a button a copy button to copy the notification details to
                 *   its clipboard.
                 */
                notifications: {
                    type: Array,
                    observer: '_renderNotifications',
                },
            };
        }

        constructor() {
            super();
            this._enhanceNavigation();
            this._setAppEventsListeners();
        }

        /**
         * Adds events listeners for the following app level events:
         *
         * - `ez:contentDiscover` to create a Universal Discovery element
         * - `ez:navigateTo` to navigate to the given url
         * - `ez:notify` to display a notification
         */
        _setAppEventsListeners() {
            this.addEventListener('ez:contentDiscover', this._createUDCustomElement.bind(this));

            this.addEventListener('ez:navigateTo', (e) => {
                this.url = e.detail.url;
            });

            this.addEventListener('ez:notify', (e) => {
                this.notifications = [e.detail.notification];
            });
        }

        /**
         * Creates ez-universal-discovery custom element and sets properties and listeners
         *
         * @param {Object} e
         */
        _createUDCustomElement(e) {
            const {config, listeners} = e.detail;
            const udw = document.createElement('ez-universal-discovery');
            const removeUdw = function () {
                udw.parentNode.removeChild(udw);
            };

            Object.keys(config).forEach(function (prop) {
                udw[prop] = config[prop];
            });
            Object.keys(listeners).forEach(function (event) {
                udw.addEventListener(event, listeners[event]);
            });
            udw.addEventListener('ez:confirm', removeUdw);
            udw.addEventListener('ez:cancel', removeUdw);
            this.appendChild(udw);
        }

        /**
         * Sets the page title. It's an observer of the `pageTitle` property.
         *
         * @param {String} newValue
         */
        _setPageTitle(newValue) {
            this.ownerDocument.title = newValue;
        }

        /**
         * Renders the given `notifications` in the app. It's an observer of the
         * `notifications` property. It also takes care of setting the
         * notification `timeout` depending on the notification `type` if the
         * timeout is not provided.
         *
         * @param {Array} notifications
         */
        _renderNotifications(notifications) {
            const bar = this.querySelector('#ez-notification-bar');
            const DEFAULT_ERROR_TIMEOUT = 0;
            const DEFAULT_TIMEOUT = 10;

            if ( !notifications ) {
                return;
            }
            notifications.forEach((info) => {
                const notification = this.ownerDocument.createElement('ez-notification');
                let timeout = parseInt(info.timeout, 10);

                if ( isNaN(timeout) ) {
                    if ( info.type === 'error' ) {
                        timeout = DEFAULT_ERROR_TIMEOUT;
                    } else {
                        timeout = DEFAULT_TIMEOUT;
                    }
                }

                notification.type = info.type;
                notification.timeout = timeout;
                notification.details = info.details;
                notification.copyable = !!info.copyable;
                notification.innerHTML = info.content;
                bar.appendChild(notification);
            });
        }

        /**
         * Runs the update process if needed after the update of the `url`
         * property. It's an observer of the `url` property.
         *
         * @param {String} updateUrl
         * @param {String} oldUrl
         */
        _triggerUpdate(updateUrl, oldUrl) {
            if ( !oldUrl ) {
                // initial dispatch, no need for an update
                return;
            }
            if ( this.updating ) {
                // update of the URL after a redirect or because the response is
                // an error so we don't retrigger an AJAX request since we are
                // in the middle of a request
                return;
            }
            this._update(updateUrl, oldUrl);
        }


        /**
         * Runs an AJAX request and updates the app with the given update url or
         * form. It runs a suite of operations that creates, enriches and uses
         * an *update info* object containing informations about the current
         * update.
         *
         * @param {String|HTMLFormElement} update either an URL to fetch or an
         * HTMLFormElement (POST) to submit
         * @param {String} oldUrl the previous URL value
         */
        _update(update, oldUrl) {
            this.updating = true;
            this._fetch(update, {'X-AJAX-Update': '1'})
                .then((response) => {
                    this.url = response.url;
                    return response.text().then(function (text) {
                        return Promise.resolve({oldUrl: oldUrl, update: update, response: response, text: text});
                    });
                })
                .then(this._parseJSON.bind(this))
                .then(this._updateApp.bind(this))
                .then(this._endUpdate.bind(this))
                .catch((updateInfo) => {
                    this.url = oldUrl;
                    this.updating = false;

                    this._notifyError(updateInfo);
                });
        }

        /**
         * Notifies the user about an error that happened during the update
         * process.
         *
         * @param {Object} updateInfo
         */
        _notifyError(updateInfo) {
            const notification = {type: 'error'};
            const error = updateInfo.error;

            // FIXME: error message should be translatable https://jira.ez.no/browse/EZP-27527
            if ( error instanceof SyntaxError ) {
                const {response, text} = updateInfo;
                let debugLink = '';

                if ( response.headers.has('X-Debug-Token-Link') ) {
                    debugLink = ` <a href="${response.headers.get('X-Debug-Token-Link')}">View in Symfony Profiler</a>`;
                }
                notification.content = `<p>Unable to decode the server response.${debugLink}</p>`;
                notification.details = `Error message:\n${error.message}\n\nJSON Server response:\n${text}`;
                notification.copyable = true;
            } else {
                notification.content = '<p>Looks like the server is taking to long to respond. Please try again</p>';
            }
            this.notifications = [notification];
        }

        /**
         * Parses the response content available in the `updateInfo` to register
         * the update structure in `updateInfo` under `struct` property. Throws
         * `updateInfo` filled with the error in case of JSON parsing error
         *
         * @param {Object} updateInfo
         * @return {Object}
         */
        _parseJSON(updateInfo) {
            try {
                updateInfo.struct = JSON.parse(updateInfo.text);
            } catch (e) {
                updateInfo.error = e;
                throw updateInfo;
            }
            return updateInfo;
        }

        /**
         * Ends the update process. It makes sure the History is correctly
         * updated, it also sets `updating` to false and fire the updated event
         * to signal the very end of the update process.
         *
         * @param {Object} updateInfo
         * @return {Object}
         */
        _endUpdate(updateInfo) {
            const {oldUrl, response, struct} = updateInfo;
            const isPost = updateInfo.update.method === 'post';

            if ( response.status > 400 ) {
                this.url = oldUrl;
            } else {
                if ( isPost ) {
                    this._replaceHistory();
                } else if ( !this._fromHistory ) {
                    this._pushHistory();
                }
            }
            delete this._fromHistory;

            this.updating = false;
            this._fireUpdated(response);

            return struct;
        }

        /**
         * Fires the `ez:app:updated` event.
         *
         * @param {Response} response
         */
        _fireUpdated(response) {
            /**
             * Fired when the app has been updated.
             *
             * @event ez:app:updated
             */
            const updated = new CustomEvent('ez:app:updated', {
                bubbles: true,
                detail: {
                    response: response,
                },
            });

            this.dispatchEvent(updated);
        }

        /**
         * Pushes a new History entry.
         */
        _pushHistory() {
            history.pushState(
                {url: this.url, enhanced: true},
                this.pageTitle,
                this.url
            );
        }

        /**
         * Replaces the current History state with a new one.
         */
        _replaceHistory() {
            history.replaceState(
                {url: this.url, enhanced: true},
                this.pageTitle,
                this.url
            );
        }

        /**
         * Updates the app from the given `updateInfo` object.
         *
         * @param {Object} updateInfo
         * @return {Object}
         */
        _updateApp(updateInfo) {
            updateElement.call(null, this, updateInfo.struct.update);

            return updateInfo;
        }

        /**
         * Enhances the navigation by handling clicks on link, back button and
         * form submit.
         */
        _enhanceNavigation() {
            this.addEventListener('click', (e) => {
                const anchor = e.target.closest('a');

                if ( PlatformUiApp._isEnhancedNavigationLink(anchor) ) {
                    e.preventDefault();
                    this.url = anchor.href;
                }
            });
            this.addEventListener('submit', (e) => {
                const form = e.target;

                if ( !PlatformUiApp._isInsideEnhancedForm(form) ) {
                    return;
                }
                e.preventDefault();
                if ( form.method === 'get' ) {
                    // submitting a GET form is like browsing
                    this.url = PlatformUiApp._buildFormUrl(form, this._formButton);
                } else {
                    this._update(form);
                }
            });
            this._popstateHandler = (e) => {
                this._goBackToState(e.state);
            };
            window.addEventListener('popstate', this._popstateHandler);
        }

        destructor() {
            window.removeEventListener('popstate', this._popstateHandler);
            super.destructor();
        }

        /**
         * Restores the given History `state`
         *
         * @param {Object} state
         */
        _goBackToState(state) {
            if ( !state || !state.url || !state.enhanced ) {
                return;
            }
            this._fromHistory = true;
            this.url = state.url;
        }

        /**
         * Checks whether the given `anchor` is suitable for the enhanced
         * navigation.
         *
         * @param {Element} anchor
         * @static
         * @return {Boolean}
         */
        static _isEnhancedNavigationLink(anchor) {
            // FIXME: we should probably further check the URI (same origin ?)
            return (
                anchor &&
                anchor.href &&
                anchor.getAttribute('href').indexOf('#') !== 0 &&
                !anchor.matches('.ez-js-standard-navigation, .ez-js-standard-navigation a')
            );
        }

        /**
         * Checks whether the given `element` is inside (or is) a form that is
         * supposed to be enhanced (ie submitted by AJAX). To not be enhanced
         * the form or one of its ancestor must have the `ez-js-standard-form`
         * class.
         *
         * @param {HTMLElement} element
         * @static
         * @return {Boolean}
         */
        static _isInsideEnhancedForm(element) {
            const form = element.closest('form');

            return !form || !form.matches('.ez-js-standard-form, .ez-js-standard-form form');
        }

        /**
         * Builds the URL corresponding for the given GET `form` optionally
         * submitted with `submitButton`.
         *
         * @param {HTMLFormElement} form
         * @param {HTMLButtonElement|HTMLInputElement} [submitButton]
         * @static
         * @return {String}
         */
        static _buildFormUrl(form, submitButton) {
            // not using FormData because Safari 10.0 and Edge have an old
            // version which does not allow to retrieve actual data but even
            // with FormData, this is not trivial.
            const values = {};
            let url = form.action + '?';

            for (let i = 0; i != form.elements.length; i++) {
                const element = form.elements[i];
                const name = element.name;

                if ( !element.disabled ) {
                    switch (element.type) {
                        case 'button':
                        case 'reset':
                        case 'submit':
                            break;
                        case 'checkbox':
                            if ( element.checked ) {
                                values[name] = element.value || 'on';
                            }
                            break;
                        case 'radio':
                            if ( element.checked ) {
                                values[name] = element.value;
                            }
                            break;
                        case 'select-one':
                            if ( element.selectedIndex !== -1 ) {
                                values[name] = element.options[element.selectedIndex].value;
                            }
                            break;
                        case 'select-multiple':
                            Array.prototype.forEach.apply(element.options, function (option) {
                                if ( option.selected ) {
                                    values[name] = values[name] || [];
                                    values[name].push(option.value);
                                }
                            });
                            break;
                        default:
                            values[name] = element.value;
                    }
                }
            }
            if ( submitButton ) {
                values[submitButton.name] = submitButton.value;
            }
            Object.keys(values).forEach(function (key) {
                if ( Array.isArray(values[key]) ) {
                    values[key].forEach(function (value) {
                        url += `${key}[]=${value}&`;
                    });
                } else {
                    url += `${key}=${values[key]}&`;
                }
            });
            return url;
        }
    }

    window.customElements.define(PlatformUiApp.is, PlatformUiApp);
})();
