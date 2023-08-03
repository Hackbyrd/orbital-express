/**
 * Socket.js client-side
 *
 * To test whether sockets and background jobs work
 */

var ws = $('#ws').text();
var hn = $('#hn').text();

const socket = io(ws, {
  withCredentials: true, // session affinity is achieved with a cookie, you need to allow credentials for cross origin
  query: {
    test: 1
  },
  transports: ['websocket']
});

// !NOTE: Could potentially have multiple sockets
// const socket2 = io(ws, {
//   withCredentials: true, // session affinity is achieved with a cookie, you need to allow credentials for cross origin
//   query: {
//     admin: 'random-string'
//   },
//   transports: ['websocket']
// });

// listen for event one
socket.on('TEST_SOCKET_EVENT_ONE', (data) => {
  console.log(data);
  $('#events').append(`<div>Emit Event 1 Success: jobId: ${data.jobId}</div>`);
});

// listen for event two
socket.on('TEST_SOCKET_EVENT_TWO', (data) => {
  console.log(data);
  $('#events').append(`<div>Emit Event 2 Success: jobId: ${data.jobId}</div>`);
});

// When socket is connected
socket.on('connect', () => {
  console.log(socket.id);
  $('#disconnected').hide();
  $('#connected').show();
});

// when socket is disconnected
socket.on('disconnect', () => {
  console.log(socket.id);
  $('#connected').hide();
  $('#disconnected').show();
});

// when button is clicked
$(document).on('click tap', '#btn', function(e) {
  e.preventDefault();

  console.log('click');
  $('#events').append(`----------------------------------------<br>`);

  // make post request
  apiPost(hn + '/v1/admins/testsocket', { id: 1 }, (err, res) => {
    if (err) {
      console.log(err);
    } else {
      console.log(res);
      $('#events').append(`<div>API Request: Success - jobId: ${res.jobId}</div>`);
    }
  });
});

// make post request
function apiPost(url, data, callback) {
  console.log(url);
  $.ajax({
    url: url, type: 'POST', contentType: 'application/json',
    dataType: 'json', data: (data ? JSON.stringify(data) : null),
    success: function(res) { return callback(null, res); },
    error: function(err) { return callback(err, null); }
  });
}
