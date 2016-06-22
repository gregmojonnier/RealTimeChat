var app = require('./server/ChatApp');
var program = require('commander');

program
    .version('1.0.0')
    .option('-p, --port <port>', 'Port for ChatApp to run on')
    .parse(process.argv);

if (program.port) {
    app.listen(program.port, function() {
        console.log('ChatApp listening on port', program.port + '!');
    });
} else {
    console.log('Port is required!');
    process.exit();
}
