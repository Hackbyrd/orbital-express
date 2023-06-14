LAYOUT PARTIALS

This folder is where we place any partials (shared HTML components) such as a common head, body header, body footer or even some body elements you want to share.
You can pass in variables from the main html component if you need to share some variables from parent to child HTML (see example below).

IMPORTANT NOTE:
This folder is "SKIPPED" during "yarn gulp" compiling of the email templates to the preview.html files.

-------------
https://ejs.co/

Includes are relative to the template with the include call. (This requires the 'filename' option.) For example if you have "./views/users.ejs" and "./views/user/show.ejs" you would use <%- include('user/show'); %>.

You'll likely want to use the raw output tag (<%-) with your include to avoid double-escaping the HTML output.

<ul>
  <% users.forEach(function(user){ %>
    <%- include('user/show', { user: user }); %>
  <% }); %>
</ul>