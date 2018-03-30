// Send Email from eml file
// From the repository root:
//
// node bin/cli.js email send_eml --from you@linagora.com --password "supersecret" --smtp smtp.linagora.com --to someone@mail.com --file ./thefile.eml

const ora = require('ora');
const nodemailer = require('nodemailer');
const { commons } = require('../../lib');

module.exports = {
  command: 'send_eml',
  desc: 'Send email to a recipient with input file as EML',
  builder: {
    from: {
      alias: 'f',
      describe: 'Email Sender',
      default: 'admin@open-paas.org',
      demand: true
    },
    password: {
      alias: 'p',
      describe: 'Sender Password',
      demand: true
    },
    smtp: {
      alias: 's',
      describe: 'STMP URL'
    },
    to: {
      alias: 't',
      describe: 'Email recipient',
      default: 'admin@open-paas.org',
      demand: true
    },
    file: {
      describe: 'The EML file to send',
      demand: true
    }
  },
  handler: argv => {
    const {from, password, smtp, to, file} = argv;
    const transporter = nodemailer.createTransport({
      host: smtp,
      port: 465,
      secure: true,
      auth: {
        user: from,
        pass: password
      }
    });
    const mailOptions = {
      // third ones will be replaced if defined in the EML file
      from: `<${from}>`,
      to: to,
      subject: 'OpenPaaS Event from EML file',
      raw: {
        path: file
      }
    };
    const spinner = ora(`Sending email to ${to}`).start();

    transporter.sendMail(mailOptions, (err, result) => {
      let status = 0;

      if (err) {
        spinner.fail(`Failed to send email ${err.message}`);
        status = -1;
      } else {
        spinner.succeed(`Mail has been sent ${result.response}`);
      }

      commons.exit(status);
    });
  }
};
