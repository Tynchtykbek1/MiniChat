$(function () {
  function redirectToLogin() {
    window.location.href = '/login.html';
  }

  function loadUsers() {
    $.ajax({
      url: '/api/users',
      method: 'GET',
      success: function (response) {
        const usersList = $('#users-list').empty();

        if (response.users.length === 0) {
          usersList.append($('<p>').text('No other active users.'));
          return;
        }

        response.users.forEach(function (user) {
          const userButton = $('<button>')
            .addClass('user-item')
            .attr('type', 'button')
            .append($('<strong>').text(user.name))
            .append($('<span>').text(user.email));

          userButton.on('click', function () {
            $('.user-item').removeClass('selected');
            $(this).addClass('selected');
            $('#chat-title').text('Chat with ' + user.name);
          });

          usersList.append(userButton);
        });
      },
      error: function (xhr) {
        if (xhr.status === 401) {
          redirectToLogin();
          return;
        }

        $('#users-list').text('Could not load users.');
      }
    });
  }

  $.ajax({
    url: '/api/me',
    method: 'GET',
    success: function (response) {
      $('#current-user-name').text(response.user.name);
      loadUsers();
    },
    error: redirectToLogin
  });

  $('#logout-button').on('click', function () {
    $.ajax({
      url: '/api/logout',
      method: 'POST',
      success: redirectToLogin,
      error: function () {
        alert('Could not log out. Please try again.');
      }
    });
  });
});
