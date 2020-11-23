import React from "react";

const Debug = () => (
  <div class="alert alert-success mt-1">
    <li>{{ SLACK_CLIENT_ID }}</li>
    <li>{{ SLACK_APP_ID }}</li>
  </div>
);

export default Debug;
