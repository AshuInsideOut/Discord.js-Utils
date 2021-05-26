let bot;

function setClient(client) {
    bot = client;
}

function getClient() {
    return bot;
}

module.exports.getClient = getClient;
module.exports.setClient = setClient;