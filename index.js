var StartChatApp = require('./server/ChatApp');
var program = require('commander');


program
    .version('1.0.0')
    .option('-p, --port <port>', 'Port for ChatApp to run on')
    .parse(process.argv);

if (program.port) {
    StartChatApp(program.port);
} else {
    console.log('Port is required!');
    process.exit();
}
