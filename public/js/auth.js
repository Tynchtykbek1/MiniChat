$(function () {
  function showMessage(text, isSuccess) {
    $('#message')
      .text(text)
      .toggleClass('success', isSuccess)
      .toggleClass('error', !isSuccess);
  }

  $('#register-form').on('submit', function (event) {
    event.preventDefault();

    $.ajax({
      url: '/api/register',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        name: $('#name').val(),
        email: $('#email').val(),
        password: $('#password').val()
      }),
      success: function (response) {
        showMessage(response.message + '. You can now log in.', true);
        $('#register-form')[0].reset();
      },
      error: function (xhr) {
        showMessage(xhr.responseJSON?.message || 'Registration failed', false);
      }
    });
  });

  $('#login-form').on('submit', function (event) {
    event.preventDefault();

    $.ajax({
      url: '/api/login',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        email: $('#email').val(),
        password: $('#password').val()
      }),
      success: function (response) {
        showMessage('Login successful. Welcome, ' + response.user.name + '!', true);
      },
      error: function (xhr) {
        showMessage(xhr.responseJSON?.message || 'Login failed', false);
      }
    });
  });
});
