var socket = io.connect();

var total = $('div.photo').length;

socket.on('received-new-photo', function(data) {
    $.notify("A new photo has arrived: " + data.name, {
        className: 'success',
        globalPosition: 'top left',
        autoHideDelay: 3000
    });
    $('h1 a').text('PHOTOS (' + ++total + ')').css("color", "#ff0000");
});

socket.on('ws-connected', function(data) {
    $.notify("New WebSocket connection established: " + data.ip, {
        className: 'success',
        autoHideDelay: 3000
    });
});

socket.on('ws-closed', function(data) {
    $.notify("WebSocket connection closed: " + data.ip, {
        className: 'warn',
        autoHideDelay: 3000
    });
});

function removePhoto(name) {
    socket.emit("remove-photo", { name: name });
    if (name != null) {
        var sanitizedName = name.replace(/\./g, '-');
        $('div.' + sanitizedName).hide('fast', function() {
            $('div.' + sanitizedName).remove();
        });
        var cnt = $('div.photo').length - 1;
        $('h1 a').text('PHOTOS (' + cnt + ')');
    }
}

function sendPhoto(name) {
    var data = {};
    data.name = name;
    socket.emit('send-photo', data);
}
