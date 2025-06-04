/**
 * Form Validation
 *
 * @description All collections to handle form validation
 */
const formValidate = {
  sshValidation: (ssh) => {
    const _pattern =
      /-----BEGIN (RSA|OPENSSH) PRIVATE KEY-----[\s\S]+-----END (RSA|OPENSSH) PRIVATE KEY-----/;
    return !_pattern.test(ssh);
  },
  repositoryUrl: (repo) => {
    const _pattern = /^git@github\.com:[\w.-]+\/[\w.-]+\.git$/;
    return !_pattern.test(repo);
  },
  mainFile: (file) => {
    const _pattern = /^[\w./-]+\.ya?ml$/;
    return !_pattern.test(file);
  },
  notEmpty: (str) => {
    return !str || str.trim() === "";
  },
  notMatchValues: (strArray, value) => {
    return !strArray.includes(value);
  },
  emailValidation: (email) => {
    const _pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !_pattern.test(email);
  },
  isEmptyElement: (elements) => {
    return elements.length === 0 || elements.every((ip) => ip.trim() === "");
  },
  isIpAddress: (elements, callback) => {
    const _regex =
      /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
    const invalid = callback(elements, _regex);
    return invalid.length > 0;
  },
  customValidation: (values, callback) => {
    const invalid = callback(values);
    return invalid.length > 0;
  },
  hasAnySpace: (str) => /\s/.test(str),
};

export default formValidate;
