import pathlib
import json
import subprocess
import unittest
import yaml

ROOT = pathlib.Path(__file__).resolve().parents[2]


class WorkflowTests(unittest.TestCase):
    def test_execution_and_checkout(self):
        for name, job_id in [('go.yml', 'build'), ('codeql.yml', 'analyze')]:
            with self.subTest(workflow=name):
                workflow = yaml.safe_load((ROOT / '.github/workflows' / name).read_text())
                job = workflow['jobs'][job_id]
                self.assertEqual(job['runs-on'], ['self-hosted', 'linux', 'x64'])
                self.assertEqual(job['container']['image'], 'golang:1.25.0-bookworm')
                checkout = next(s for s in job['steps'] if s.get('uses', '').startswith('actions/checkout@'))
                self.assertIs(checkout['with']['persist-credentials'], False)
                self.assertEqual(checkout['with']['ref'], '${{ github.event.pull_request.head.sha || github.sha }}')
                self.assertIn("github.actor_id == '45983094'", job['if'])
                self.assertIn('github.event.pull_request.head.repo.full_name == github.repository', job['if'])
                commands = '\n'.join(s.get('run', '') for s in job['steps'])
                self.assertNotIn('sudo ', commands)
                self.assertIn('libudev-dev libpipewire-0.3-dev pkg-config', commands)

    def test_owner_event_guards(self):
        for name, job_id in [('go.yml', 'build'), ('codeql.yml', 'analyze')]:
            job = yaml.safe_load((ROOT / '.github/workflows' / name).read_text())['jobs'][job_id]
            for actor, event, head, expected in [
                ('45983094', 'push', None, True),
                ('45983094', 'pull_request', 'example/project', True),
                ('45983094', 'pull_request', 'other/project', False),
                ('123', 'push', None, False),
                ('123', 'pull_request', 'example/project', False),
            ]:
                with self.subTest(workflow=name, actor=actor, event=event, head=head):
                    context = {'actor_id': actor, 'event_name': event, 'repository': 'example/project',
                               'event': {'pull_request': {'head': {'repo': {'full_name': head}}}}}
                    script = 'const github = ' + json.dumps(context) + '; console.log(Boolean(' + job['if'] + '));'
                    result = subprocess.run(['node', '-e', script], check=True, capture_output=True, text=True)
                    self.assertEqual(result.stdout.strip(), str(expected).lower())

    def test_preserved_graph(self):
        go = yaml.safe_load((ROOT / '.github/workflows/go.yml').read_text())
        self.assertEqual(set(go['jobs']), {'build'})
        self.assertEqual(go['permissions'], {'contents': 'read'})
        self.assertIn('go build -v ./...', [s.get('run') for s in go['jobs']['build']['steps']])
        ql = yaml.safe_load((ROOT / '.github/workflows/codeql.yml').read_text())
        self.assertEqual(set(ql['jobs']), {'analyze'})
        self.assertEqual(ql['jobs']['analyze'].get('permissions', {}).get('security-events'), 'write')
        steps = ql['jobs']['analyze']['steps']
        self.assertTrue(any(s.get('uses') == 'github/codeql-action/analyze@v4' for s in steps))
        init = next(s for s in steps if s.get('uses') == 'github/codeql-action/init@v4')
        self.assertEqual(init['with']['languages'], 'go')
        self.assertEqual(init['with']['build-mode'], 'manual')
        self.assertIn('go build -v ./...', [s.get('run') for s in steps])


if __name__ == '__main__':
    unittest.main()
