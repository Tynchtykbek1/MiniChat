$(function () {
  let currentUser = null;
  let selectedUserId = null;
  let socket = null;

  function redirectToLogin() {
    window.location.href = '/login.html';
  }

  function scrollMessagesToBottom() {
    const messagesList = $('#messages-list');
    messagesList.scrollTop(messagesList[0].scrollHeight);
  }

  function messageBelongsToSelectedConversation(message) {
    return selectedUserId && (
      (message.sender_id === currentUser.id && message.receiver_id === selectedUserId) ||
      (message.sender_id === selectedUserId && message.receiver_id === currentUser.id)
    );
  }

  function appendMessage(message) {
    const isMine = message.sender_id === currentUser.id;
    const messageElement = $('<div>')
      .addClass('chat-message')
      .addClass(isMine ? 'my-message' : 'their-message')
      .text(message.message_text);

    $('#messages-list').append(messageElement);
    scrollMessagesToBottom();
  }

  function renderMessages(messages) {
    const messagesList = $('#messages-list').empty();

    if (messages.length === 0) {
      messagesList.append($('<p>').addClass('empty-chat').text('No messages yet.'));
      return;
    }

    messages.forEach(appendMessage);
  }

  function loadMessages(userId) {
    $.ajax({
      url: '/api/messages/' + userId,
      method: 'GET',
      success: function (response) {
        renderMessages(response.messages);
      },
      error: function (xhr) {
        if (xhr.status === 401) {
          redirectToLogin();
          return;
        }

        $('#messages-list').html(
          $('<p>').addClass('empty-chat').text('Could not load messages.')
        );
      }
    });
  }

  function connectSocket() {
    socket = io();

    socket.on('receive_message', function (message) {
      if (messageBelongsToSelectedConversation(message)) {
        $('.empty-chat').remove();
        appendMessage(message);
      }
    });
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
            selectedUserId = user.id;
            $('.user-item').removeClass('selected');
            $(this).addClass('selected');
            $('#chat-title').text('Chat with ' + user.name);
            loadMessages(selectedUserId);
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
      currentUser = response.user;
      $('#current-user-name').text(currentUser.name);
      $('#admin-link').toggle(currentUser.role === 'admin');
      connectSocket();
      loadUsers();
    },
    error: redirectToLogin
  });

  $('#message-form').on('submit', function (event) {
    event.preventDefault();

    const messageText = $('#message-input').val().trim();

    if (!selectedUserId) {
      alert('Select a user first.');
      return;
    }

    if (!messageText) {
      return;
    }

    socket.emit(
      'send_message',
      { receiverId: selectedUserId, messageText },
      function (response) {
        if (response.success) {
          $('#message-input').val('');
          return;
        }

        alert(response.message || 'Could not send message.');
      }
    );
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
