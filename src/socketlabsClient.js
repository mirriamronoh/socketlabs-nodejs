const request = require('request');
const version = require('../package.json').version;

const sendValidator = require('./core/sendValidator');
const factory = require('./core/injectionRequestFactory');

const { Attachment, BasicMessage, BulkMessage, BulkRecipient, CustomHeader, EmailAddress, MergeData } = require('./message/messageClasses');

const sendResultEnum = require('./sendResultEnum');
const sendResponse = require('./sendResponse');

/**
 * SocketLabsClient is a wrapper for the SocketLabs Injection API that makes 
 * it easy to send messages and parse responses.
 * @example
 * var message = new BasicMessage();
 * 
 * // Build your message
 * 
 * var client = new SocketLabsClient(00000, "apiKey");
 * 
 * client.send(message).then(
 *     (res)=>{
 *         // Handle Success
 *     },
 *     (err) => {
 *         // Handle Error
 *     }
 * );
 */
class SocketLabsClient {

    /**
     * Creates a new instance of the SocketLabsClient
     * @param {number} serverId - Your SocketLabs ServerId number.
     * @param {string} apiKey - Your SocketLabs Injection API key
     * @param {string} endpointUrl - The SocketLabs Injection API endpoint Url
     * @param {string} optionalProxy - The http proxy you would like to use.
     */
    constructor(serverId, apiKey, {
        endpointUrl = null,
        optionalProxy = null,
    } = {}) {

        /**
         * Your SocketLabs ServerId number.
         */
        this.serverId = serverId;

        /**
         * Your SocketLabs Injection API key
         */
        this.apiKey = apiKey;

        /**
         * The SocketLabs Injection API endpoint Url
         */
        this.userAgent = `SocketLabs-node/${version} (nodejs ${process.version})`;

        /**
         * The SocketLabs Injection API endpoint Url
         */
        this.endpointUrl = "https://inject.socketlabs.com/api/v1/email";
        if (endpointUrl && endpointUrl !== '') {
            this.endpointUrl = endpointUrl;
        }

        if (optionalProxy && typeof optionalProxy === 'string') {
            request.defaults({
                'proxy': optionalProxy
            });
        }
    }

    /**
     * Sends a basic or bulk email message and returns the response from the Injection API.
     * @param {object[]} messageData.to - the list of To recipients. (emailAddress[] or bulkRecipient[])
     * @param {emailAddress} messageData.from - the From address.
     * @param {emailAddress} [messageData.replyTo] - the Reply To address.
     * @param {string} messageData.subject - the message Subject.
     * @param {emailAddress[]} [messageData.cc] - the optional list of CC recipients. (basic send only)
     * @param {emailAddress[]} [messageData.bcc] - the optional list of BCC recipients. (basic send only)
     * @param {string} [messageData.textBody] - the plain text portion of the message body.
     * @param {string} [messageData.htmlBody] - the HTML portion of the message body.
     * @param {number} [messageData.apiTemplate] - the Api Template for the message.
     * @param {*} [messageData.attachments] - the optional list of file attachments for the message.
     * @param {string} [messageData.messageId] - the custom MessageId for the message.
     * @param {string} [messageData.mailingId] - the custom MailingId for the message.
     * @param {string} [messageData.charSet] - the optional character set for your message.
     * @param {customHeaders[]} [messageData.customHeaders] - the optional list of custom message headers added to the message.
     * @param {mergeData[]} [messageData.globalMergeData] - the optional list of mergeData items that will be global across the whole message. (bulk send only)
     * @param {string} messageData.messageType - type of message being sent 
     * @returns {sendResponse} - SendResponse promise
     */
    send(messageData) {
        return new Promise((resolve, reject) => {
            var validator = new sendValidator();

            var result = validator.validateCredentials(this.serverId, this.apiKey);
            if (result.result !== sendResultEnum.Success) {
                return reject(result);
            }

            factory.generateRequest(messageData).then(
                (requestJson) => {
                    if (requestJson) {

                        var postBody = {
                            serverId: this.serverId,
                            apiKey: this.apiKey,
                            messages: [requestJson]
                        };

                        request.post({
                                body: postBody,
                                headers: {
                                    'User-Agent': this.userAgent
                                },
                                json: true,
                                url: this.endpointUrl
                            },
                            function (err, res, body) {

                                if (err) {
                                    result = new sendResponse({
                                        result: sendResultEnum.UnknownError
                                    });

                                    if (typeof err === 'string') {
                                        result.responseMessage = err;
                                    }
                                    reject(result);
                                }

                                var response = sendResponse.parse(res);

                                if (response.result === sendResultEnum.Success) {
                                    resolve(response);
                                } else {
                                    reject(response)
                                }
                            }
                        );
                    }
                },
                (errorResult) => {
                    reject(errorResult);
                });
        });
    }
}

module.exports = {
    SocketLabsClient,
    Attachment,
    BasicMessage,
    BulkMessage,
    BulkRecipient,
    CustomHeader,
    EmailAddress,
    MergeData
};