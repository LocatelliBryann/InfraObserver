"""Auditoria do Windows: quem fez cada ação nos arquivos monitorados.

O Windows registra no log de Segurança quem alterou ou apagou um arquivo
(eventos 4663 e 4660) e de que IP veio um acesso pela rede (5145). O agente
liga essa auditoria nas pastas monitoradas, lê esses eventos e usa o usuário,
o programa e o IP para completar os eventos de arquivo do watchdog.
"""
