import abc

class Analyzer(abc.ABC):

	@abc.abstractmethod
	def __init__(self):
		pass

	@abc.abstractmethod
	def run(self, dataset):
		pass