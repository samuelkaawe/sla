# PhonePad

O celular vira um controle de Xbox 360 no PC. O volante usa o giroscópio e aceita qualquer rotação, até 7200° (batente a batente).

## Como gerar o .exe e o .apk (sem instalar nada)
1. Crie um repositório no GitHub e envie esta pasta inteira.
2. Abra a aba **Actions**, rode **build** (ou espere o push terminar).
3. Baixe os artefatos **PhonePad-exe** (PhonePad.exe) e **PhonePad-apk** (app-debug.apk).

## Ou compile no seu PC
- **.exe:** instale o Python 3.11+ e dê dois cliques em `build.bat`. Resultado: `dist\PhonePad.exe`.
- **.apk:** com Node 20 e Android Studio: `npm install`, `npx cap add android`, `npx cap sync android`, `bash tools/patch-android.sh` e depois `cd android && gradlew assembleDebug`.

## Usar
1. No PC, instale o driver **ViGEmBus** (github.com/nefarius/ViGEmBus/releases) e abra o `PhonePad.exe`. Permita o firewall para redes privadas.
2. No celular, instale o APK, digite o IP mostrado no PC e toque em **Conectar por Wi-Fi**.
3. **USB:** ative a depuração USB, clique em "Ativar conexão USB" no PC (precisa do `adb`) e toque em **Conectar por USB** no celular.
4. Vários celulares podem conectar ao mesmo tempo (até 4 controles).

## Modo volante
- **Giroscópio:** gira o celular como um volante; acumula o ângulo, então 540°, 900° ou 1440° funcionam. A gravidade corrige o drift.
- **Inclinação:** ângulo absoluto, até 180° no total.
- **Layout "Volante na tela":** o volante gira com o dedo (várias voltas), sem usar sensores; escolha em ⚙ > Layout.
- **Toque:** gire o volante na tela com o dedo; mais voltas que o celular permitiria.
- Em ⚙: rotação total, zona morta, curva, inverter, **Centralizar**. Pedais: arraste para cima = mais.
- Nos jogos, ajuste o "steering range" do jogo para o valor desejado; o PhonePad envia o eixo de -100% a +100%.

## Também faz
Layouts Gamepad e Volante, vibração do jogo no celular, encaminhamento de controle físico ligado ao celular, QR no PC (versão web, sem giroscópio).

## Vibração (force feedback)
O celular vibra com a força que o jogo manda ao controle (borda, derrapagem, batida). Ajuste em ⚙ > Força da vibração. Só no APK; no navegador a força é fixa.

## Resistência simulada
No layout com volante girado pela tela, quando o jogo vibra o volante é puxado para o centro (ajuste em ⚙ > Resistência do volante da tela). É uma simulação: o app não sabe a posição real da roda no jogo.

## Teclas de volume
Em ⚙, escolha qual botão do controle cada tecla de volume (+ e −) aciona. Só funciona no APK, com o controle conectado; sem escolha, o volume funciona normalmente.

## Editar layout
Em ⚙ > **Editar layout** (ou no botão da tela inicial): arraste os controles, toque num para mudar tamanho, cor, texto e função, adicione ou exclua. **Duplicar** cria um layout seu; **Restaurar padrão** volta ao original.

## Ficou de fora
Bluetooth, Linux e leitura de QR no app.
