@echo off

cls

rem �p�X�̐ݒ�
@set PATH=%~dp0lib;%PATH%

rem ���̃o�b�`�����݂��Ă���t�H���_���J�����g�ɂ���
pushd %~dp0

rem MongoDB�̋N��
tasklist | findstr "mongod"
if not errorlevel 1 (
    echo MongoDB�͂��łɋN�����Ă��܂�
) else (
    start /b mongod --dbpath data\db --logpath data\log
    echo MongoDB���N�����܂���
)

rem node�T�[�o�̋N��
start /b supervisor -i public app
echo Node�T�[�o���N�����܂���

exit
