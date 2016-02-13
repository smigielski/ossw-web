var express = require('express');
var app = express();
var http = require('http').Server(app);
var ipaddress = process.env.OPENSHIFT_NODEJS_IP;
var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var wsUrl = '://' + (process.env.OPENSHIFT_APP_DNS?process.env.OPENSHIFT_APP_DNS+":8000" : 'localhost:8080') ;
if (typeof ipaddress === "undefined") {
            ipaddress = "127.0.0.1";
};

var server = app.listen(port, ipaddress)
var io      = require('socket.io').listen(server);
var fs      = require('fs');

/**
 *  Define the sample application.
 */
var SampleApp = function() {

    //  Scope.
    var self = this;

    /**
     *  Populate the cache.
     */
    // self.populateCache = function() {
    //     if (typeof self.zcache === "undefined") {
    //         self.zcache = { 'index.html': '' };
    //     }
    //
    //     //  Local cache for static content.
    //     self.zcache['index.html'] = fs.readFileSync('./index.html');
    // };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    // self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };

    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /**
     *  Create the routing table entries + handlers for the application.
     */
    // self.createRoutes = function() {
        // self.routes = { };

        // self.routes['/'] = function(req, res) {
        //     res.setHeader('Content-Type', 'text/html');
        //     // res.send(self.cache_get('index.html') );
        // };
    // };

    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeHttpServer = function() {
      // self.createRoutes();

      app.get('/ws', function (req, res) {
        res.send({url: req.protocol + wsUrl});
      });

      //  Add handlers for the app (from the routes).
      for (var r in self.routes) {
          app.get(r, self.routes[r]);
      }

      app.use(express.static('public'));

    };

    self.initializeSocketIO = function() {
      io.on('connection', function(socket){

        var client = {
          ip : socket.request.headers['x-client-ip'] || socket.request.connection.remoteAddress,
          userAgent: socket.request.headers['user-agent']
        };

        console.log('a user connected' + JSON.stringify(client));

        var channel;
        socket.on('channel', function(_channel){
          if (_channel===undefined){
            //create new
            channel = {token: socket.id, url: wsUrl};
            socket.emit('channel',channel);
          } else {
            channel = _channel;
            console.log('joining: ' + channel.token);
            socket.join(channel.token);
            socket.broadcast.to(channel.token).emit('client', client);
          }
        });

        socket.on('message', function(message){
          socket.broadcast.to(channel.token).emit('message', message);
        })
      });
    }

    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        // self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeHttpServer();
        self.initializeSocketIO();
    };

};


/**
 *  main():  Main code.
 */
var zapp = new SampleApp();
zapp.initialize();
