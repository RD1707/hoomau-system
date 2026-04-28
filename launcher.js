const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BOT_DIR = path.join(__dirname, 'whatsapp-bot');
const WEB_DIR = path.join(__dirname, 'web');

let spinnerInterval;

function startSpinner(text) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  process.stdout.write('\x1b[?25l'); // hide cursor
  spinnerInterval = setInterval(() => {
    process.stdout.write(`\r\x1b[36m${frames[i]}\x1b[0m ${text}`);
    i = (i + 1) % frames.length;
  }, 100);
}

function stopSpinner(successText) {
  if (spinnerInterval) clearInterval(spinnerInterval);
  process.stdout.write(`\r\x1b[32m✔\x1b[0m ${successText}\x1b[K\n`);
  process.stdout.write('\x1b[?25h'); // show cursor
}

function failSpinner(errorText) {
  if (spinnerInterval) clearInterval(spinnerInterval);
  process.stdout.write(`\r\x1b[31m✖\x1b[0m ${errorText}\x1b[K\n`);
  process.stdout.write('\x1b[?25h');
}

async function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: true });
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`Exit code ${code}`));
    });
  });
}

async function main() {
  console.log('\x1b[36m=======================================================\x1b[0m');
  console.log('\x1b[1m         SISTEMA HOOMAU - INICIALIZAÇÃO\x1b[0m');
  console.log('\x1b[36m=======================================================\x1b[0m\n');

  // Check Node.js
  try {
    startSpinner('Verificando Node.js...');
    execSync('node -v');
    stopSpinner('Node.js verificado');
  } catch (err) {
    failSpinner('Node.js não encontrado!');
    console.error('Instale o Node.js v20+ em nodejs.org');
    process.exit(1);
  }

  // Check/Install Bot Dependencies
  if (!fs.existsSync(path.join(BOT_DIR, 'node_modules'))) {
    startSpinner('Instalando dependências do Bot (isso pode demorar)...');
    try {
      await runCommand('npm', ['install'], BOT_DIR);
      stopSpinner('Dependências do Bot instaladas');
    } catch (err) {
      failSpinner('Falha ao instalar dependências do Bot');
      process.exit(1);
    }
  } else {
    console.log('\x1b[32m✔\x1b[0m Dependências do Bot OK');
  }

  // Compile Bot
  if (!fs.existsSync(path.join(BOT_DIR, 'dist'))) {
    startSpinner('Compilando o Bot...');
    try {
      await runCommand('npm', ['run', 'build'], BOT_DIR);
      stopSpinner('Bot compilado com sucesso');
    } catch (err) {
      failSpinner('Falha ao compilar o Bot');
      process.exit(1);
    }
  }

  // Config Files Check
  if (!fs.existsSync(path.join(BOT_DIR, '.env'))) {
    fs.copyFileSync(path.join(BOT_DIR, '.env.example'), path.join(BOT_DIR, '.env'));
    console.log('\n\x1b[33m[AVISO] Um arquivo .env padrão foi gerado.\x1b[0m');
    console.log('Preencha as variáveis de ambiente (Supabase/Gemini) e reinicie o script.');
    process.exit(0);
  }

  console.log('\n\x1b[32mTodos os requisitos verificados. Iniciando serviços...\x1b[0m\n');

  // Start Bot Process
  const botProcess = spawn('npm', ['start'], { cwd: BOT_DIR, shell: true });

  let isConnected = false;
  
  botProcess.stdout.on('data', (data) => {
    const text = data.toString();
    
    // Pass QR Code lines to standard output for scanning
    if (text.includes('██████') || text.includes('▄▄▄▄▄▄') || text.includes('▀▀▀▀▀▀')) {
      process.stdout.write(text);
    }
    
    if (text.includes('QR Code gerado')) {
      console.log('\n\x1b[33m[!] WhatsApp não conectado. Por favor, escaneie o QR Code acima.\x1b[0m\n');
    }

    if (text.includes('WhatsApp conectado') && !isConnected) {
      isConnected = true;
      console.log('\n\x1b[32m=======================================================\x1b[0m');
      console.log('\x1b[1m[OK] WHATSAPP CONECTADO COM SUCESSO!\x1b[0m');
      console.log('\x1b[32m=======================================================\x1b[0m');
      console.log(' - O bot já está online e pronto para receber mensagens.');
      console.log(' - Para finalizar o sistema, pressione Ctrl+C ou feche esta janela.\n');
    }
    
    // Optional: Log errors in red
    if (text.toLowerCase().includes('error')) {
      console.error(`\x1b[31m[BOT ERROR] ${text.trim()}\x1b[0m`);
    }
  });

  botProcess.stderr.on('data', (data) => {
    // Some libraries log standard info to stderr. We filter obvious errors.
    const text = data.toString();
    if (text.toLowerCase().includes('error')) {
      console.error(`\x1b[31m[BOT ERRO/AVISO] ${text.trim()}\x1b[0m`);
    }
  });

  botProcess.on('close', (code) => {
    console.log(`\n\x1b[31mBot encerrado com código ${code}.\x1b[0m`);
    process.exit(code);
  });
}

main().catch(err => {
  console.error('\n\x1b[31mErro fatal:', err.message, '\x1b[0m');
  process.exit(1);
});
