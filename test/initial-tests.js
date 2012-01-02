var ami = require(__dirname + '/../lib');
var Action = require(__dirname + '/../lib/action');

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var MockSocket = function() {
  EventEmitter.call(this);
  this.outgoing = [];
  this.data = [];
}

util.inherits(MockSocket, EventEmitter);

//emit data on process.nextTick
MockSocket.prototype.emitSoon = function() {
  var self = this;
  if(arguments.length) {
    this.outgoing.push(arguments);
  }
  process.nextTick(function() {
    var args = self.outgoing.shift();
    if(args) {
      self.emit.apply(self, args);
      self.emitSoon();
    }
  })
}

MockSocket.prototype.connect = function(port, host, connectListener) {
  this.port = port;
  if('function' === typeof host) {
    connectListener = host;
  }
  else if('function' === typeof connectListener) {
    this.on('connect', connectListener);
  }
  this.host = host;
}

MockSocket.prototype.write = function(data) {
  this.data.push(data);
}

describe('Client', function() {
  describe('connection', function() {
    describe('success', function() {
      var socket = new MockSocket();
      var client = new ami.Client(socket);
      var port = 5038;
      var host = 'localhost';

      before(function(done) {
        socket.emitSoon('connect');
        client.connect(port, host, done);
      })

      it('sets socket properties', function() {
        client.socket.port.should.equal(5038);
        client.socket.host.should.equal('localhost');
      })
    })

    describe('error', function() {
      var socket = new MockSocket();
      var client = new ami.Client(socket);
      var port = 5038;
      var host = 'localhost';
      
      it('emits error', function(done) {
        client.connect(1234);
        client.on('error', function() {
          done();
        });
        socket.emitSoon('error', new Error("fake error"));
      })
    })
  })

  describe('login', function() {
    describe('success', function() {
      var socket = new MockSocket();
      var client = new ami.Client(socket);

      beforeEach(function() {
        //enqueue a successful login message
        var packet = [
        'Response: Success',
        'ActionID: ' + Action.lastActionID,
        'Message: Authentication accepted',
        ].join('\r\n') + '\r\n\r\n'
        socket.emitSoon('data', Buffer(packet,'utf8'))
      })


      it('sends correct login message', function() {
        client.login('user', 'pass', function() {
        })
        socket.data[0].should.equal([
          'Action: login',
          'Username: user',
          'Secret: pass',
          'ActionID: ' + (Action.lastActionID-1),
          '',''].join('\r\n'))
      })

      it('calls callback with no error', function(done) {
        client.login('test', 'boom', done);
      })

      it('emits a login success message', function(done) {
        client.login('test', 'boom');
        client.on('message', function(msg) {
          msg.actionID.should.equal(Action.lastActionID-1);
          msg.response.should.equal('Success');
          msg.message.should.equal('Authentication accepted');
          done();
        })
      })
    })
  })
})

describe('Client', function() {
  describe('incomming message parsing', function() {

    it('doesn\'t choke on startup greeting message', function(done) {
      var socket = new MockSocket();
      var client = new ami.Client(socket);
      socket.emitSoon('data', Buffer('Asterisk Call Manager/1.1\r\n', 'utf8'));
      
      client.on('message', function(msg) {
        msg.should.equal('Asterisk Call Manager/1.1');
        done();
      })
    })

    it('handles unfinished startup')
  })

  describe('split packets', function(done) {
    var socket = new MockSocket();
    var client = new ami.Client(socket);

    before(function() {
      //socket.emitSoon('data', Buffer('Asterisk Call Man'))
      //socket.emitSoon('data', Buffer('ager/1.1\r\n'))
      var firstPartOfResponse = ''
      socket.emitSoon('data', Buffer('Response: Success\r\nActionID: ', 'utf8'))
      socket.emitSoon('data', Buffer(Action.lastActionID + '\r\nMessage: test\r\n\r\n'))
    })

    it('parse correctly', function(done) {
      return done();
      client.login('name', 'pw');
      client.on('message', function(msg) {
        done()
      })
    })
  })
})
