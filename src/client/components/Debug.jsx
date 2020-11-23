import React from "react";
import Alert from "react-bootstrap/Alert";
import { inspect } from "util";

const Debug = ({ data }) => (
  <Alert variant="info" className="mt-2">
    <pre>{inspect(data, { depth: null, compact: false })}</pre>
  </Alert>
);

export default Debug;
