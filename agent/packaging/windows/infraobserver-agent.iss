; Instalador do InfraObserver Agent para Windows (Inno Setup 6).
; Gerado pelo build.ps1, que passa a versão e a pasta com os arquivos:
;   ISCC.exe /DAppVersion=1.5.0 /DNumericVersion=1.5.0.0 /DSourceDir=<stage> infraobserver-agent.iss
;
; Instalação silenciosa (ex.: em vários computadores):
;   InfraObserverAgentSetup-1.5.0.exe /VERYSILENT /SERVER=https://infraobserver.com.br /TOKEN=<token>
; Parâmetros opcionais: /DIRS="C:\Pasta1,\\servidor\pasta" (pastas monitoradas).
; Numa atualização silenciosa sem /SERVER e /TOKEN, a configuração atual é mantida.

#ifndef AppVersion
  #define AppVersion "0.0.0-dev"
#endif
#ifndef NumericVersion
  #define NumericVersion "0.0.0.0"
#endif
#ifndef SourceDir
  #define SourceDir "..\..\build\windows\stage"
#endif

#define ServiceId "InfraObserverAgent"

[Setup]
AppId={{8C5D7B5E-3B0F-4E57-9B0B-6F3B1D2A9C41}
AppName=InfraObserver Agent
AppVersion={#AppVersion}
AppVerName=InfraObserver Agent {#AppVersion}
AppPublisher=InfraObserver
AppPublisherURL=https://infraobserver.com.br
VersionInfoVersion={#NumericVersion}
DefaultDirName={autopf}\InfraObserver Agent
DisableDirPage=auto
DisableProgramGroupPage=yes
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
OutputBaseFilename=InfraObserverAgentSetup-{#AppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupIconFile=infraobserver.ico
UninstallDisplayIcon={app}\agent\infraobserver-agent.exe
UninstallDisplayName=InfraObserver Agent
CloseApplications=no
SetupLogging=yes

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Dirs]
Name: "{commonappdata}\InfraObserver"
Name: "{commonappdata}\InfraObserver\logs"

[InstallDelete]
; Numa atualização, remove as bibliotecas da versão anterior antes de copiar.
Type: filesandordirs; Name: "{app}\agent"

[Files]
Source: "{#SourceDir}\InfraObserverAgent.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\InfraObserverAgent.xml"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\agent\*"; DestDir: "{app}\agent"; Flags: ignoreversion recursesubdirs createallsubdirs

[Code]
const
  ServiceId = '{#ServiceId}';
  KeyServerUrl = 'INFRAOBSERVER_SERVER_URL';
  KeyToken = 'INFRAOBSERVER_AGENT_TOKEN';
  KeyDirectories = 'INFRAOBSERVER_MONITORED_DIRECTORIES';

var
  ServerPage: TInputQueryWizardPage;
  ServerUrl: String;
  AgentToken: String;
  MonitoredDirs: String;

function ConfigDir(): String;
begin
  Result := ExpandConstant('{commonappdata}\InfraObserver');
end;

function ConfigFile(): String;
begin
  Result := ConfigDir() + '\agent.env';
end;

{ Executa um comando sem janela e devolve o código de saída (-1 se não abriu). }
function RunHidden(const FileName, Params: String): Integer;
var
  ResultCode: Integer;
begin
  if not Exec(FileName, Params, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
    ResultCode := -1;
  Log(Format('%s %s -> %d', [FileName, Params, ResultCode]));
  Result := ResultCode;
end;

function ServiceExists(): Boolean;
begin
  Result := RunHidden(ExpandConstant('{sys}\sc.exe'), 'query ' + ServiceId) = 0;
end;

procedure StopService();
begin
  if ServiceExists() then
    { net stop espera o serviço parar; 2 = já estava parado. }
    RunHidden(ExpandConstant('{sys}\net.exe'), 'stop ' + ServiceId);
end;

{ ---------- Arquivo agent.env ---------- }

function NormalizeServerUrl(Value: String): String;
begin
  Value := Trim(Value);
  while (Length(Value) > 0) and (Value[Length(Value)] = '/') do
    Delete(Value, Length(Value), 1);
  Result := Value;
end;

function IsValidServerUrl(const Value: String): Boolean;
var
  Lower: String;
begin
  Lower := Lowercase(Value);
  Result := ((Pos('http://', Lower) = 1) and (Length(Lower) > 7)) or
            ((Pos('https://', Lower) = 1) and (Length(Lower) > 8));
end;

{ O valor vai entre aspas no agent.env: aspas e quebras de linha não podem. }
function IsSafeValue(const Value: String): Boolean;
begin
  Result := (Pos('"', Value) = 0) and (Pos(#13, Value) = 0) and (Pos(#10, Value) = 0);
end;

function StripQuotes(Value: String): String;
begin
  Value := Trim(Value);
  if (Length(Value) >= 2) and (Value[1] = '"') and (Value[Length(Value)] = '"') then
    Value := Copy(Value, 2, Length(Value) - 2);
  Result := Value;
end;

function GetEnvValue(const Lines: TArrayOfString; const Key: String): String;
var
  I: Integer;
  Line: String;
begin
  Result := '';
  for I := 0 to GetArrayLength(Lines) - 1 do
  begin
    Line := Trim(Lines[I]);
    if Pos(Key + '=', Line) = 1 then
    begin
      Result := StripQuotes(Copy(Line, Length(Key) + 2, Length(Line)));
      Exit;
    end;
  end;
end;

procedure SetEnvValue(var Lines: TArrayOfString; const Key, Value: String);
var
  I, Count: Integer;
begin
  Count := GetArrayLength(Lines);
  for I := 0 to Count - 1 do
    if Pos(Key + '=', Trim(Lines[I])) = 1 then
    begin
      Lines[I] := Key + '="' + Value + '"';
      Exit;
    end;

  SetArrayLength(Lines, Count + 1);
  Lines[Count] := Key + '="' + Value + '"';
end;

{ Atualiza só as chaves informadas; outras configurações do arquivo ficam. }
procedure WriteConfiguration();
var
  Lines: TArrayOfString;
begin
  if (ServerUrl = '') and (AgentToken = '') and (MonitoredDirs = '') then
  begin
    Log('Keeping existing configuration');
    Exit;
  end;

  if not LoadStringsFromFile(ConfigFile(), Lines) then
  begin
    SetArrayLength(Lines, 1);
    Lines[0] := '# Configuração do InfraObserver Agent (criada pelo instalador)';
  end;

  if ServerUrl <> '' then
    SetEnvValue(Lines, KeyServerUrl, ServerUrl);
  if AgentToken <> '' then
    SetEnvValue(Lines, KeyToken, AgentToken);
  if MonitoredDirs <> '' then
    SetEnvValue(Lines, KeyDirectories, MonitoredDirs);

  ForceDirectories(ConfigDir());
  if not SaveStringsToUTF8File(ConfigFile(), Lines, False) then
    RaiseException('Não foi possível gravar ' + ConfigFile());

  Log('Configuration written to ' + ConfigFile());
end;

{ O agent.env guarda o token: só Administradores e SYSTEM podem ler a pasta.
  Os SIDs funcionam em Windows de qualquer idioma. }
procedure ProtectConfigDir();
begin
  RunHidden(ExpandConstant('{sys}\icacls.exe'),
    '"' + ConfigDir() + '" /inheritance:r /grant:r *S-1-5-18:(OI)(CI)F *S-1-5-32-544:(OI)(CI)F');
end;

{ ---------- Assistente ---------- }

function InitializeSetup(): Boolean;
begin
  Result := True;
  ServerUrl := NormalizeServerUrl(ExpandConstant('{param:SERVER|}'));
  AgentToken := Trim(ExpandConstant('{param:TOKEN|}'));
  MonitoredDirs := Trim(ExpandConstant('{param:DIRS|}'));

  if (ServerUrl <> '') and not IsValidServerUrl(ServerUrl) then
  begin
    SuppressibleMsgBox('O /SERVER precisa começar com http:// ou https://.', mbError, MB_OK, IDOK);
    Result := False;
  end
  else if not (IsSafeValue(AgentToken) and IsSafeValue(MonitoredDirs)) then
  begin
    SuppressibleMsgBox('O /TOKEN e o /DIRS não podem ter aspas nem quebras de linha.', mbError, MB_OK, IDOK);
    Result := False;
  end
  else if WizardSilent() and not FileExists(ConfigFile()) and
          ((ServerUrl = '') or (AgentToken = '')) then
  begin
    SuppressibleMsgBox('Na instalação silenciosa, informe /SERVER= e /TOKEN=.', mbError, MB_OK, IDOK);
    Result := False;
  end;
end;

procedure InitializeWizard();
var
  Lines: TArrayOfString;
begin
  ServerPage := CreateInputQueryPage(wpWelcome,
    'Conexão com o servidor',
    'Para onde este computador envia os dados?',
    'Informe o endereço do InfraObserver e o token do agente, fornecido pelo administrador. ' +
    'Numa atualização, os valores atuais já vêm preenchidos.');
  ServerPage.Add('Endereço do servidor (ex.: https://infraobserver.com.br):', False);
  ServerPage.Add('Token do agente:', True);

  { Atualização: preenche com o que já está configurado. }
  if LoadStringsFromFile(ConfigFile(), Lines) then
  begin
    if ServerUrl = '' then
      ServerUrl := GetEnvValue(Lines, KeyServerUrl);
    if AgentToken = '' then
      AgentToken := GetEnvValue(Lines, KeyToken);
  end;

  ServerPage.Values[0] := ServerUrl;
  ServerPage.Values[1] := AgentToken;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID <> ServerPage.ID then
    Exit;

  ServerUrl := NormalizeServerUrl(ServerPage.Values[0]);
  AgentToken := Trim(ServerPage.Values[1]);

  if not IsValidServerUrl(ServerUrl) then
  begin
    SuppressibleMsgBox('Informe o endereço começando com http:// ou https://.', mbError, MB_OK, IDOK);
    Result := False;
  end
  else if AgentToken = '' then
  begin
    SuppressibleMsgBox('Informe o token do agente.', mbError, MB_OK, IDOK);
    Result := False;
  end
  else if not IsSafeValue(AgentToken) then
  begin
    SuppressibleMsgBox('O token não pode ter aspas.', mbError, MB_OK, IDOK);
    Result := False;
  end;
end;

{ ---------- Serviço ---------- }

{ Antes de copiar os arquivos: para o serviço da versão anterior. }
function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  StopService();
  Result := '';
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ServiceTool: String;
begin
  if CurStep <> ssPostInstall then
    Exit;

  WriteConfiguration();
  ProtectConfigDir();

  ServiceTool := ExpandConstant('{app}\InfraObserverAgent.exe');
  if not ServiceExists() then
    if RunHidden(ServiceTool, 'install') <> 0 then
      RaiseException('Não foi possível registrar o serviço ' + ServiceId + '.');

  if RunHidden(ExpandConstant('{sys}\net.exe'), 'start ' + ServiceId) <> 0 then
    SuppressibleMsgBox('O serviço foi instalado, mas não iniciou. Veja os logs em ' +
      ConfigDir() + '\logs.', mbInformation, MB_OK, IDOK);
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
  begin
    StopService();
    if ServiceExists() then
      RunHidden(ExpandConstant('{app}\InfraObserverAgent.exe'), 'uninstall');
  end
  else if CurUninstallStep = usPostUninstall then
  begin
    DelTree(ConfigDir() + '\logs', True, True, True);

    { A configuração e o identificador ficam, para uma reinstalação voltar
      como o mesmo endpoint. Na desinstalação manual, o usuário escolhe. }
    if not UninstallSilent() then
      if MsgBox('Remover também a configuração e o identificador deste computador?' + #13#10 +
                'Se reinstalar depois, ele aparecerá como um novo endpoint.',
                mbConfirmation, MB_YESNO or MB_DEFBUTTON2) = IDYES then
        DelTree(ConfigDir(), True, True, True);
  end;
end;
