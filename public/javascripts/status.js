var socket = io.connect();

socket.on('status-update', function(data) {
    var ip = data.ip.replace(/\./g, '-');
    $('div.' + ip + ' td.name').text('# ' + data.ip);
    $('div.' + ip + ' td.cpu').text(data.cpu);
    $('div.' + ip + ' td.mem').text(data.mem);
    $('div.' + ip + ' td.rd').text(data.rd);
    $('div.' + ip + ' td.wd').text(data.wd);
});

socket.on('screenshot', function(data) {
    var ip = data.ip.replace(/\./g, '-');
    $('div.' + ip + ' img').replaceWith("<img src='data:image/png;base64, " + data.image + "'>");
});

socket.on('ws-connected', function(data) {
    location.reload();
});

socket.on('ws-closed', function(data) {
    location.reload();
});

function refreshImage(name) {
    $('div.' + name +' img').replaceWith("<img src='screenshot?name=" + name + ".jpg'>");
}
