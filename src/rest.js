/*jslint browser: true, nomen: true */
/*global easyXDM, kraken, module */
/*global IMVU:true*/
var IMVU = IMVU || {};

(function () {
    var document_ready = false,
        rpc_client = null,
        queue = [];

    IMVU.Rest = {
        ajaxSettings: {},
        // Note: use IMVU.Rest.(post|get|delete_). It's much less boilerplate. [Code is inside the $.each at the bottom of the file]
        ajax: function (arg_jquery_ajax_settings, arg_imvu_ajax_settings) {
            // TODO: evaluate removing dataType:'json'
            var jquery_ajax_settings = $.extend({dataType:'json'}, $.ajaxSettings, arg_jquery_ajax_settings),
                imvu_ajax_settings = $.extend({ }, IMVU.Rest.ajaxSettings, arg_imvu_ajax_settings),
                old_before_send = jquery_ajax_settings.beforeSend;

            IMVU.Rest._assert_sauce_required(imvu_ajax_settings);

            if (imvu_ajax_settings.hasOwnProperty('xhr')) {
                jquery_ajax_settings.xhr = imvu_ajax_settings.xhr;
            } else if (rpc_client) {
                jquery_ajax_settings.xhr = IMVU.Rest._rpc_xhr;
                $.support.cors = true; // This causes jQuery to pretend that IE8 supports CORS.  Our custom-written XHR object will make it work. -- andy 30 July 2012
            }

            jquery_ajax_settings.beforeSend = function (xhr, settings) {
                xhr.setRequestHeader('X-IMVU-Sauce', imvu_ajax_settings.sauce);
                if (old_before_send) {
                    old_before_send(xhr, settings);
                }
            };

            return $.ajax(jquery_ajax_settings);
        },

        ajaxSetup: function (imvu_ajax_settings) {
            IMVU.Rest.ajaxSettings = $.extend({ }, IMVU.Rest.ajaxSettings, imvu_ajax_settings);
        },

        _ltrim: function (str) {
            return str.replace(/^\s+/, '');
        },

        _split_first: function split_first(str, ch) {
            var idx = str.indexOf(ch),
                head = str.substring(0, idx),
                tail = str.substring(idx);
            return [head, tail];
        },

        //XXX: this doesn't really adhere to rfc2616 sec 4.2 + sec 2.2
        _parse_http_headers: function parse_http_headers(http_headers) {
            var header_lines = http_headers.replace(/\r\n/, "\n").split("\n"),
                header_dict = { },

                header_line = null,
                limit = null,
                keyval = null,
                key = null,
                val = null;

            for (header_line in header_lines) {
                if (header_lines.hasOwnProperty(header_line)) {
                    limit = 2;
                    keyval = IMVU.Rest._split_first(http_headers, ':');
                    key = keyval[0];
                    val = IMVU.Rest._ltrim(keyval[1]);
                    header_dict[key] = val;
                }
            }
            return header_dict;
        },

        _default_arg: function default_arg(arg, default_value) {
            return (typeof arg === 'undefined') ? default_value : arg;
        },

        _test_cors_withCredentials_support: function (Xhr) {
            try {
                return Xhr.prototype.hasOwnProperty('withCredentials') || (new Xhr()).hasOwnProperty('withCredentials');
            } catch (e) {
                return false;
            }
        },

        _is_cors_withCredentials_supported: function () {
            return IMVU.Rest._test_cors_withCredentials_support(window.XMLHttpRequest);
        },

        _get_translated_subdomain_prefix: function (host) {
            var subdomain = host.split('.')[0];
            return (subdomain.length === 2) ? subdomain + '.' : '';
        },

        get_base_url: function (host) {
            var is_in_sandbox = (host.match(/localhost\.imvu\.com$/) !== null);
            return is_in_sandbox ? 'http://api.localhost.imvu.com/' : 'https://' + IMVU.Rest._get_translated_subdomain_prefix(host) + 'api.imvu.com/';
        },

        _get_remote_iframe_endpoint: function (host) {
            return IMVU.Rest.get_base_url(host) + '__xhr';
        },

        _init_rpc_client: function init_rpc_client() {
            function fire_ready_event() {
                var i = 0;
                $(document).trigger('IMVU.Rest.ready');
                for (i = 0; i < queue.length; i += 1) {
                    queue[i]();
                }
                queue = [];
            }
            function create_easyXDM_client() {
                rpc_client = new easyXDM.Rpc(xdm_config, rpc_spec);
            }
            document_ready = true;
            if (!IMVU.Rest._is_cors_withCredentials_supported()) {
                var remote_endpoint = IMVU.Rest._get_remote_iframe_endpoint(window.location.hostname),
                    xdm_config = {
                        remote: remote_endpoint,
                        onReady: fire_ready_event
                    },
                    rpc_spec = {
                        remote: {
                            send_request: { }
                        }
                    };
                if (typeof module !== 'undefined') {
                    module.importJs('/common/js/easyXDM-2.4.15.118/easyXDM.js', create_easyXDM_client);
                } else {
                    create_easyXDM_client();
                }
            } else {
                fire_ready_event();
            }
        },

        _is_client_ready: function is_client_ready() {
            return rpc_client !== null;
        },

        _assert_sauce_required: function assert_sauce_required(dict) {
            if (!dict.hasOwnProperty('sauce')) {
                throw new IMVU.Rest.AjaxError("sauce is required; can't use IMVU.Rest.ajax without sauce");
            }
        },

        _rpc_xhr: function rpc_xhr() {
            var params = {
                    url: null,
                    method: null,
                    username: null,
                    password: null,
                    data: null,
                    headers: { }
                },
                response = {
                    headers: { },
                    raw_headers: ''
                },
                ignore_rpc_response = false,
                priv_rpc_xhr = {
                    readyState: 0,
                    status: 0,
                    statusText: '',
                    responseText: '',

                    onreadystatechange: function () { },

                    open: function (method, url, async, username, password) {
                        params.method = method;
                        params.url = url;
                        params.username = IMVU.Rest._default_arg(username, null);
                        params.password = IMVU.Rest._default_arg(password, null);

                        if (!IMVU.Rest._default_arg(async, true)) {
                            throw new IMVU.Rest.AjaxError("can't make synchronous requests with rpc_xhr");
                        }
                    },

                    abort: function () {
                        ignore_rpc_response = true;
                    },

                    setRequestHeader: function (header, value) {
                        params.headers[header] = value;
                    },

                    getResponseHeader: function (header) {
                        return response.headers[header];
                    },

                    getAllResponseHeaders: function () {
                        return response.raw_headers;
                    },

                    send: function (data) {
                        var DONE = 4;

                        function rpc_success_cont(rpc_response) {
                            if (!ignore_rpc_response) {
                                priv_rpc_xhr.status = rpc_response.status;
                                priv_rpc_xhr.responseText = rpc_response.responseText;
                                priv_rpc_xhr.readyState = DONE;

                                response.raw_headers = rpc_response.raw_headers;
                                response.headers = IMVU.Rest._parse_http_headers(response.raw_headers);

                                priv_rpc_xhr.onreadystatechange();
                            }
                        }

                        if (IMVU.Rest._default_arg(data, null) !== null) {
                            params.data = data;
                        }

                        if (IMVU.Rest._is_client_ready()) {
                            rpc_client.send_request(params, rpc_success_cont);
                        } else {
                            queue.push(function () {
                                rpc_client.send_request(params, rpc_success_cont);
                            });
                        }
                    }
                };
            return priv_rpc_xhr;
        }
    };


    // Each of the keys in this object corresponds to a post.
    // For example, IMVU.Rest.put = is an alias to a rest request.
    var methodNameDictionary = {
        "put": "PUT",
        "post": "POST",
        "delete_": "DELETE",
        "get": "GET"
    };

    // Initialize each of the methods. No unnecessary code duplication.
    _.each(methodNameDictionary, function(restType, restMethodName) {
        IMVU.Rest[restMethodName] = function(jquery_ajax_settings, arg_imvu_ajax_settings) {
            // The jQuery_ajax_settings is in this format:
            // var jquery_ajax_settings = {
            //     url: url,
            //     data: JSON.stringify({ ... });
            //     error : function(e) { ... },
            //     success : function(e) { ... },
            // }

            // These are the default values. jQuery's default arguments are overridden with this.
            var defaults = {
                type: restType,
                contentType : 'application/json; charset=UTF-8',
                xhrFields: {
                    withCredentials: true
                },
                dataType: 'json'
            };
            $.extend(defaults, jquery_ajax_settings);

            return IMVU.Rest.ajax(defaults, arg_imvu_ajax_settings || {});
        };
    });

    IMVU.Rest.AjaxError = function (message) {
        this.name = "AjaxError";
        this.message = message || "Ajax Error";
    };
    if (typeof Error !== 'undefined') {
        IMVU.Rest.AjaxError.prototype = new Error();
        IMVU.Rest.AjaxError.constructor = IMVU.Rest.AjaxError;
    } else {
        IMVU.Rest.AjaxError.prototpe = {
            toString: function () {
                return this.name + ": " + this.message;
            }
        };
    }
}());
