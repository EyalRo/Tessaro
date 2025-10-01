module.exports = async function (context) {
  const name = context.request.query.name || 'Fission';
  return {
    status: 200,
    body: `Hello, ${name}!`
  };
};
