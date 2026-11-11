from jinja2 import Environment, FileSystemLoader

env = Environment(loader=FileSystemLoader("src/octoprint/templates"), autoescape=True)
env.filters["edq"] = lambda value: value
env.filters["esq"] = lambda value: value
print(
    env.get_template("dialogs/settings/accesscontrol.jinja2").render(
        _=lambda text, **kwargs: text % kwargs if kwargs else text
    )
)
