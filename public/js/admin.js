$(function () {
  let currentAdmin = null;

  function redirectToLogin() {
    window.location.href = '/login.html';
  }

  function formatDate(value) {
    return new Date(value).toLocaleString();
  }

  function loadUsers() {
    $.ajax({
      url: '/api/admin/users',
      method: 'GET',
      success: function (response) {
        const tableBody = $('#users-table-body').empty();

        if (response.users.length === 0) {
          tableBody.append(
            $('<tr>').append($('<td colspan="7">').text('No users found.'))
          );
          return;
        }

        response.users.forEach(function (user) {
          const nextStatus = user.status === 'active' ? 'blocked' : 'active';
          const actionText = user.status === 'active' ? 'Block' : 'Unblock';
          const actionButton = $('<button>')
            .addClass('small-button')
            .attr('type', 'button')
            .text(actionText);

          if (user.id === currentAdmin.id && nextStatus === 'blocked') {
            actionButton.prop('disabled', true).text('Current admin');
          }

          actionButton.on('click', function () {
            updateUserStatus(user.id, nextStatus);
          });

          tableBody.append(
            $('<tr>')
              .append($('<td>').text(user.id))
              .append($('<td>').text(user.name))
              .append($('<td>').text(user.email))
              .append($('<td>').text(user.role))
              .append($('<td>').text(user.status))
              .append($('<td>').text(formatDate(user.created_at)))
              .append($('<td>').append(actionButton))
          );
        });
      },
      error: handleAdminError
    });
  }

  function updateUserStatus(userId, status) {
    $.ajax({
      url: '/api/admin/users/' + userId + '/status',
      method: 'PATCH',
      contentType: 'application/json',
      data: JSON.stringify({ status }),
      success: loadUsers,
      error: function (xhr) {
        alert(xhr.responseJSON?.message || 'Could not update user.');
      }
    });
  }

  function loadMessages() {
    $.ajax({
      url: '/api/admin/messages',
      method: 'GET',
      success: function (response) {
        const tableBody = $('#messages-table-body').empty();

        if (response.messages.length === 0) {
          tableBody.append(
            $('<tr>').append($('<td colspan="6">').text('No messages found.'))
          );
          return;
        }

        response.messages.forEach(function (message) {
          const deleteButton = $('<button>')
            .addClass('small-button danger-button')
            .attr('type', 'button')
            .text('Delete')
            .on('click', function () {
              deleteMessage(message.id);
            });

          tableBody.append(
            $('<tr>')
              .append($('<td>').text(message.id))
              .append($('<td>').text(message.sender_name + ' (' + message.sender_email + ')'))
              .append($('<td>').text(message.receiver_name + ' (' + message.receiver_email + ')'))
              .append($('<td>').text(message.message_text))
              .append($('<td>').text(formatDate(message.created_at)))
              .append($('<td>').append(deleteButton))
          );
        });
      },
      error: handleAdminError
    });
  }

  function deleteMessage(messageId) {
    if (!confirm('Delete this message?')) {
      return;
    }

    $.ajax({
      url: '/api/admin/messages/' + messageId,
      method: 'DELETE',
      success: loadMessages,
      error: function (xhr) {
        alert(xhr.responseJSON?.message || 'Could not delete message.');
      }
    });
  }

  function handleAdminError(xhr) {
    if (xhr.status === 401) {
      redirectToLogin();
      return;
    }

    if (xhr.status === 403) {
      window.location.href = '/chat.html';
      return;
    }

    alert(xhr.responseJSON?.message || 'Admin request failed.');
  }

  $.ajax({
    url: '/api/me',
    method: 'GET',
    success: function (response) {
      currentAdmin = response.user;

      if (currentAdmin.role !== 'admin') {
        window.location.href = '/chat.html';
        return;
      }

      $('#admin-name').text(currentAdmin.name);
      loadUsers();
      loadMessages();
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
